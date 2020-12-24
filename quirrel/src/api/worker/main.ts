import { createWorker } from ".";
import { createRedisFactory } from "../shared/create-redis";
import { StructuredLogger } from "../shared/structured-logger";

const {
  REDIS_URL,
  ENABLE_USAGE_METERING,
  RUNNING_IN_DOCKER,
  CONCURRENCY,
  DISABLE_TELEMETRY,
  INCIDENT_RECEIVER_ENDPOINT,
  INCIDENT_RECEIVER_PASSPHRASE,
} = process.env;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

async function main() {
  const worker = await createWorker({
    redisFactory: createRedisFactory(REDIS_URL ?? "redis://localhost:6379"),
    enableUsageMetering: Boolean(ENABLE_USAGE_METERING),
    runningInDocker: Boolean(RUNNING_IN_DOCKER),
    concurrency: Number.parseInt(CONCURRENCY ?? "") || 100,
    disableTelemetry: Boolean(DISABLE_TELEMETRY),
    logger: new StructuredLogger(),
    incidentReceiver: INCIDENT_RECEIVER_ENDPOINT
      ? {
          endpoint: INCIDENT_RECEIVER_ENDPOINT,
          passphrase: INCIDENT_RECEIVER_PASSPHRASE!,
        }
      : undefined,
  });

  async function teardown(signal: string) {
    await worker.close();
    console.log("Received %s - terminating server app ...", signal);
    process.exit(2);
  }

  process.on("SIGTERM", teardown);
  process.on("SIGINT", teardown);
}

main();
