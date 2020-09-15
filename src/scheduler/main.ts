import { createServer } from ".";

const { PORT = 9181, REDIS_URL, HOST, PASSPHRASES } = process.env;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

async function main() {
  const scheduler = await createServer({
    port: +PORT,
    host: HOST,
    redis: !!REDIS_URL ? REDIS_URL : undefined,
    passphrases: !!PASSPHRASES ? PASSPHRASES.split(":") : undefined,
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
