require("../shared/tracer")("quirrel-worker");
import { createWorker } from ".";
import { cliWithConfig } from "../../shared/cliWithConfig";
import { createRedisFactory } from "../shared/create-redis";
import { StructuredLogger } from "../shared/structured-logger";

cliWithConfig(async (config) => {
  const {
    REDIS_URL,
    ENABLE_USAGE_METERING,
    RUNNING_IN_DOCKER,
    CONCURRENCY,
    DISABLE_TELEMETRY,
    INCIDENT_RECEIVER_ENDPOINT,
    INCIDENT_RECEIVER_PASSPHRASE,
  } = config;

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

  return {
    teardown: worker.close,
  };
});
