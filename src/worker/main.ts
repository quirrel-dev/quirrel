import { createWorker } from ".";

const { REDIS_URL, ENABLE_USAGE_METERING } = process.env;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

async function main() {
  const worker = await createWorker({
    redis: !!REDIS_URL ? REDIS_URL : undefined,
    enableUsageMetering: Boolean(ENABLE_USAGE_METERING)
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
