import fastify from "fastify";
import redisPlugin from "./redis";
import health from "./routes/health";
import jobs from "./routes/jobs";
import type * as redis from "redis";

export interface QuirrelServerConfig {
  port?: number;
  host?: string;
  redis?: redis.ClientOpts | string;
}

export async function createServer({
  port = 3000,
  host = "0.0.0.0",
  redis,
}: QuirrelServerConfig) {
  const app = fastify({
    logger: true,
  });

  app.register(redisPlugin, { opts: redis });
  app.register(health, { prefix: "/health" });
  app.register(jobs, { prefix: "/jobs" });

  await app.listen(port, host);

  return {
    port,
    async close() {
      app.log.info("Closing.");
      await app.close();
    },
  };
}
