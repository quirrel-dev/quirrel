require("./shared/tracer")("quirrel");
import { runQuirrel } from ".";
import { cliWithConfig } from "../shared/cliWithConfig";
import { createRedisFactory } from "./shared/create-redis";

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
    INCIDENT_RECEIVER_ENDPOINT,
    INCIDENT_RECEIVER_PASSPHRASE,
    ENABLE_SSRF_PREVENTION,
    JWT_PUBLIC_KEY,
    POSTHOG_API_KEY,
  } = config;

  const quirrel = await runQuirrel({
    port: +PORT,
    host: HOST,
    redisFactory: createRedisFactory(REDIS_URL, {
      tlsCa: {
        base64: REDIS_TLS_CA_BASE64,
        path: REDIS_TLS_CA_FILE,
      },
    }),
    passphrases: !!PASSPHRASES ? PASSPHRASES.split(":") : undefined,
    jwtPublicKey: JWT_PUBLIC_KEY,
    runningInDocker: Boolean(RUNNING_IN_DOCKER),
    disableTelemetry: Boolean(DISABLE_TELEMETRY),
    logger: "structured",
    enableSSRFPrevention: !!ENABLE_SSRF_PREVENTION,
    postHogApiKey: POSTHOG_API_KEY,
    incidentReceiver: INCIDENT_RECEIVER_ENDPOINT
      ? {
          endpoint: INCIDENT_RECEIVER_ENDPOINT,
          passphrase: INCIDENT_RECEIVER_PASSPHRASE!,
        }
      : undefined,
  });

  return {
    teardown: quirrel.close,
  };
});
