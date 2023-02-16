import { QuirrelConfig, runQuirrel } from "../../api";
import IORedis from "ioredis";
import { createRedisFactory } from "../../api/shared/create-redis";
import { CronDetector } from "../cron-detector";
import { Command } from "commander";
import { getApplicationBaseUrl } from "../../client/config";

function requireFrameworkClientForDevelopmentDefaults(framework: string) {
  require(`../../${framework}`);
}

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

export async function runQuirrelDev(
  config: Omit<QuirrelConfig, "redisFactory"> & {
    redisUrl?: string;
    cronCwd?: string;
  }
) {
  const { redisUrl, cronCwd } = config;
  if (redisUrl) {
    if (!(await isRedisConnectionIntact(redisUrl))) {
      throw new Error("Couldn't connect to Redis.");
    }
  }

  const quirrel = await runQuirrel({
    ...config,
    redisFactory: createRedisFactory(redisUrl, {
      tlsCa: {
        base64: process.env.REDIS_TLS_CA_BASE64,
        path: process.env.REDIS_TLS_CA_FILE,
      },
    }),
  });

  let cronDetector: CronDetector | undefined;

  if (cronCwd) {
    cronDetector = new CronDetector(cronCwd, async (jobs) => {
      const firstJob = jobs[0];
      if (firstJob) {
        requireFrameworkClientForDevelopmentDefaults(firstJob.framework);
      }

      await quirrel.server.app.jobs.updateCron("anonymous", {
        baseUrl: getApplicationBaseUrl(config.host),
        crons: jobs,
      });
    });
    await cronDetector.awaitReady();
  }

  return async () => {
    await quirrel.close();
    await cronDetector?.close();
  };
}

export default function registerRun(program: Command) {
  program
    .option("-h, --host <host>", "host to bind on", "localhost")
    .option("-p, --port <port>", "port to bind on", "9181")
    .option("-r, --redis-url <redis-url>", "enables the redis backend")
    .option("-q, --quiet", "silences welcome message, condenses output", false)
    .option("--no-cron", "Disable cron job detection")
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
        quiet,
      }: {
        redisUrl?: string;
        passphrase: string[];
        host: string;
        port: string;
        cron: boolean;
        quiet: boolean;
      }) => {
        const exit = await runQuirrelDev({
          redisUrl,
          cronCwd: cron ? process.cwd() : undefined,
          passphrases: passphrase,
          host,
          port: Number(port),
          disableTelemetry: Boolean(process.env.DISABLE_TELEMETRY),
          logger: quiet ? "quiet" : "dx",
        });

        process.on("SIGINT", async () => {
          await exit();
          process.exit();
        });
      }
    );
}
