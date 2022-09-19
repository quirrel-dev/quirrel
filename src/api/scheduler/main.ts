require("../shared/tracer")("quirrel-scheduler");
import { createServer } from ".";
import { cliWithConfig } from "../../shared/cliWithConfig";
import { createRedisFactory } from "../shared/create-redis";
import { StructuredLogger } from "../shared/structured-logger";

cliWithConfig(async (config) => {
  const {
    PORT = 9181,
    REDIS_URL,
    REDIS_TLS_CA_BASE64,
    REDIS_TLS_CA_FILE,
    HOST,
    PASSPHRASES,
    RUNNING_IN_DOCKER,
    DISABLE_TELEMETRY,
    JWT_PUBLIC_KEY,
    POSTHOG_API_KEY,
  } = config;

  const scheduler = await createServer({
    port: +PORT,
    host: HOST,
    redisFactory: createRedisFactory(REDIS_URL ?? "redis://localhost:6379", { 
      tlsCa: {
        base64: REDIS_TLS_CA_BASE64,
        path: REDIS_TLS_CA_FILE,
      },
    }),
    passphrases: !!PASSPHRASES ? PASSPHRASES.split(":") : undefined,
    jwtPublicKey: JWT_PUBLIC_KEY,
    runningInDocker: Boolean(RUNNING_IN_DOCKER),
    disableTelemetry: Boolean(DISABLE_TELEMETRY),
    logger: new StructuredLogger(),
    postHogApiKey: POSTHOG_API_KEY,
  });

  return {
    teardown: scheduler.close,
  };
});
