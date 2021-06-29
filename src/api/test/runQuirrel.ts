import { QuirrelConfig, runQuirrel } from "..";
import { createRedisFactory } from "../shared/create-redis";

export async function run(
  backend: "Redis" | "Mock",
  config?: Partial<QuirrelConfig>
) {
  const redisFactory = createRedisFactory(
    backend === "Redis"
      ? process.env.REDIS_URL ?? "redis://localhost:6379"
      : undefined
  );
  const { httpServer, close } = await runQuirrel({
    port: 0,
    redisFactory,
    disableTelemetry: true,
    logger: "none",
    ...config,
  });

  const redis = redisFactory();

  return {
    teardown: close,
    server: httpServer,
    redis,
  };
}
