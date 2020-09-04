import { FastifyPluginCallback } from "fastify";

import * as GetHealthResponseSchema from "../schemas/health.json";
import { GETHealthResponse } from "../types/health";

const health: FastifyPluginCallback = (app, opts, done) => {
  app.get<{ Reply: GETHealthResponse }>("/", {
    schema: {
      response: {
        data: GetHealthResponseSchema
      },
    },

    async handler(request, reply) {
      reply.status(200);
      reply.send({
        redis: "up"
      })
    },
  });

  done();
};

export default health;
