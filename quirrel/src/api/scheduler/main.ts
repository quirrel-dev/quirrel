import { createServer } from ".";
import { createRedisFactory } from "../shared/create-redis";
import { StructuredLogger } from "../shared/structured-logger";

const {
  PORT = 9181,
  REDIS_URL,
  HOST,
  PASSPHRASES,
  RUNNING_IN_DOCKER,
  DISABLE_TELEMETRY,
  JWT_PUBLIC_KEY
} = process.env;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

async function main() {
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

  async function teardown(signal: string) {
    await scheduler.close();
    console.log("Received %s - terminating server app ...", signal);
    process.exit(2);
  }

  process.on("SIGTERM", teardown);
  process.on("SIGINT", teardown);
}

main();
