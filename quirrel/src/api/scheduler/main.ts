import "../shared/tracer"
import { createServer } from ".";
import { cliWithConfig } from "../../shared/cliWithConfig";
import { createRedisFactory } from "../shared/create-redis";
import { StructuredLogger } from "../shared/structured-logger";

cliWithConfig(async (config) => {
  const {
    PORT = 9181,
    REDIS_URL,
    HOST,
    PASSPHRASES,
    RUNNING_IN_DOCKER,
    DISABLE_TELEMETRY,
    JWT_PUBLIC_KEY
  } = config;

  const scheduler = await createServer({
    port: +PORT,
    host: HOST,
    redisFactory: createRedisFactory(REDIS_URL ?? "redis://localhost:6379"),
    passphrases: !!PASSPHRASES ? PASSPHRASES.split(":") : undefined,
    jwtPublicKey: JWT_PUBLIC_KEY,
    runningInDocker: Boolean(RUNNING_IN_DOCKER),
    disableTelemetry: Boolean(DISABLE_TELEMETRY),
    logger: new StructuredLogger(),
  });

  return {
    teardown: scheduler.close,
  };
});
