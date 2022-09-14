import { QuirrelConfig, runQuirrel } from "..";
import { createRedisFactory } from "../shared/create-redis";

export async function run(
  backend: "Redis" | "Mock",
  config?: Partial<QuirrelConfig>
) {
  const redisFactory = createRedisFactory(
    backend === "Redis"
      ? process.env.REDIS_URL ?? "redis://localhost:6379"
      : undefined,
    {
      tls: process.env.REDIS_TLS_CA_BASE64 ? { caBase64: process.env.REDIS_TLS_CA_BASE64 } : { caPath: process.env.REDIS_TLS_CA_FILE } 
    }
  );
  const { httpServer, close, server } = await runQuirrel({
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
    app: server,
    redis,
  };
}
