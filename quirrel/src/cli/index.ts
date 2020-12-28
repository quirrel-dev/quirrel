#!/usr/bin/env node

import { program } from "commander";
import pack from "../../package.json";
import open from "open";
import { runQuirrel } from "../api";
import IORedis = require("ioredis");
import { createRedisFactory } from "../api/shared/create-redis";
import { registerCron } from "./register-cron";
import { CronWatcher } from "./cron-watcher";

async function isRedisConnectionIntact(redisUrl: string) {
  try {
    const client = new IORedis(redisUrl);
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

function collect(value: string, previous: string[] = []) {
  return previous.concat([value]);
}

program
  .version(pack.version)
  .option("-h, --host <host>", "host to bind on", "localhost")
  .option("-p, --port <port>", "port to bind on", "9181")
  .option("-r, --redis-url <redis-url>", "enables the redis backend")
  .option(
    "--passphrase <passphrase>",
    "secure the server with a passphrase",
    collect
  )
  .action(
    async ({
      redisUrl,
      passphrase,
      host,
      port,
    }: {
      redisUrl?: string;
      passphrase: string[];
      host: string;
      port: string;
    }) => {
      if (redisUrl) {
        if (!(await isRedisConnectionIntact(redisUrl))) {
          console.log("Couldn't connect to Redis.");
          process.exit(1);
        }
      }

      const quirrel = await runQuirrel({
        redisFactory: createRedisFactory(redisUrl),
        runningInDocker: false,
        passphrases: passphrase,
        host,
        port: Number(port),
        disableTelemetry: Boolean(process.env.DISABLE_TELEMETRY),
        logger: "dx",
      });

      const cronWatcher = new CronWatcher(quirrel.server.app, process.cwd());

      cronWatcher.startWatching();

      process.on("SIGINT", async () => {
        await quirrel.close();
        cronWatcher.close();
        process.exit();
      });
    }
  );

function getChromeName() {
  switch (process.platform) {
    case "win32":
      return "chrome";
    case "darwin":
      return "google chrome";
    case "linux":
      return "google-chrome";
    default:
      throw new Error("OS not supported yet, please open an issue.");
  }
}

program
  .command("ui")
  .description("Opens the Quirrel UI")
  .action(async () => {
    console.log("Opening Quirrel UI ...");

    open("https://ui.quirrel.dev", { app: getChromeName() });
  });

program
  .command("register-cron [cwd]")
  .description("Detects CronJob() calls and registers them with Quirrel.")
  .option("-d, --dry-run", "List detected jobs, don't register them.", false)
  .option("-p, --production", "Use production config.", false)
  .action(
    async (
      cwd = process.cwd(),
      { dryRun, production }: { dryRun: boolean; production: boolean }
    ) => {
      if (production) {
        process.env.NODE_ENV = "production";
      }

      await registerCron({
        dryRun,
        cwd,
      });
    }
  );

program.parse(process.argv);
