import { FastifyPluginCallback } from "fastify";

import GetHealthResponseSchema from "../schemas/health.json";
import { GETHealthResponse } from "../types/health";

const health: FastifyPluginCallback = (app, opts, done) => {
  function checkRedis() {
    return new Promise<boolean>((resolve, reject) => {
      app.redis.ping((err, reply) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  app.get<{ Reply: GETHealthResponse }>(
    "/",
    {
      schema: {
        response: {
          200: GetHealthResponseSchema,
        },
        tags: ["Admin"],
        summary: "Check availability"
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
