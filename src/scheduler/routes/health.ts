import { FastifyPluginCallback } from "fastify";

import * as GetHealthResponseSchema from "../schemas/health.json";
import { GETHealthResponseSchema } from "../types/health";

const health: FastifyPluginCallback = (app, opts, done) => {
  app.get<{ Reply: GETHealthResponseSchema }>("/", {
    schema: {
      response: {
        data: GetHealthResponseSchema
      },
    },

    async handler(request, reply) {
      reply.status(200);
      return {
        redis: "up",
      };
    },
  });

  done();
};

export default health;
