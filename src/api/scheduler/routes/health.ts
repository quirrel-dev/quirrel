import { FastifyPluginCallback } from "fastify";

import { GETHealthResponse } from "../types/health.js";
import { readFileSync } from "fs";
import { join } from "path";

const health: FastifyPluginCallback = (app, opts, done) => {
  async function checkRedis() {
    try {
      await app.redis.ping();
      return true;
    } catch (e) {
      return false;
    }
  }

  app.get<{ Reply: GETHealthResponse }>(
    "/",
    {
      schema: {
        response: {
          200: JSON.parse(
            readFileSync(join(import.meta.url, "..", "..", "schemas", "health.json"), "utf-8")
          ),
        },
        tags: ["Admin"],
        summary: "Check availability",
      },
    },
    async (request, reply) => {
      const redis = await checkRedis();

      reply.status(redis ? 200 : 502);
      reply.send({
        redis: redis ? "up" : "down",
      });
    }
  );

  done();
};

export default health;
