import { runQuirrel } from ".";
import { createRedisFactory } from "./shared/create-redis";

const {
  PORT = 9181,
  REDIS_URL,
  HOST,
  PASSPHRASES,
  RUNNING_IN_DOCKER,
  DISABLE_TELEMETRY,
  INCIDENT_RECEIVER_ENDPOINT,
  INCIDENT_RECEIVER_PASSPHRASE,
} = process.env;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

async function main() {
  const quirrel = await runQuirrel({
    port: +PORT,
    host: HOST,
    redisFactory: createRedisFactory(REDIS_URL),
    passphrases: !!PASSPHRASES ? PASSPHRASES.split(":") : undefined,
    runningInDocker: Boolean(RUNNING_IN_DOCKER),
    disableTelemetry: Boolean(DISABLE_TELEMETRY),
    logger: "structured",
    incidentReceiver: INCIDENT_RECEIVER_ENDPOINT
      ? {
          endpoint: INCIDENT_RECEIVER_ENDPOINT,
          passphrase: INCIDENT_RECEIVER_PASSPHRASE!,
        }
      : undefined,
  });

  async function teardown(signal: string) {
    await quirrel.close();
    console.log("Received %s - terminating server app ...", signal);
    process.exit(2);
  }

  process.on("SIGTERM", teardown);
  process.on("SIGINT", teardown);
}

main();
