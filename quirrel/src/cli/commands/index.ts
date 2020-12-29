import { runQuirrel } from "../../api";
import IORedis = require("ioredis");
import { createRedisFactory } from "../../api/shared/create-redis";
import { CronDetector } from "../cron-detector";
import { Command } from "commander";

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

export default function registerRun(program: Command) {
  program
    .option("-h, --host <host>", "host to bind on", "localhost")
    .option("-p, --port <port>", "port to bind on", "9181")
    .option("-r, --redis-url <redis-url>", "enables the redis backend")
    .option("--no-cron", "Disable cron job detection", false)
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
        cron,
      }: {
        redisUrl?: string;
        passphrase: string[];
        host: string;
        port: string;
        cron: boolean;
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

        let cronDetector: CronDetector | undefined;

        if (cron) {
          cronDetector = new CronDetector(process.cwd(), quirrel.server.app);
          await cronDetector.awaitReady();
        }

        process.on("SIGINT", async () => {
          await quirrel.close();
          await cronDetector?.close();
          process.exit();
        });
      }
    );
}
