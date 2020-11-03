import { runQuirrel } from "../src";
import { createRedisFactory } from "../src/shared/create-redis";

export async function run(passphrases?: string[]) {
  const redisFactory = createRedisFactory(process.env.REDIS_URL);
  const { httpServer, close } = await runQuirrel({
    port: 0,
    redisFactory,
    passphrases,
    disableTelemetry: true,
  });

  const redis = redisFactory();

  return {
    teardown: close,
    server: httpServer,
    redis,
  };
}
