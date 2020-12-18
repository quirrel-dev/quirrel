import { FastifyPluginCallback } from "fastify";
import { UsageMeter } from "../../shared/usage-meter";

import DELETEUsageResponseSchema from "../schemas/usage/DELETE/response.json";
import { DELETEUsageResponse } from "../types/usage/DELETE/response";

const usageRoute: FastifyPluginCallback = (fastify, opts, done) => {
  const usageMeter = new UsageMeter(fastify.redis);

  fastify.addHook("onRequest", fastify.basicAuth);

  fastify.delete<{ Reply: DELETEUsageResponse }>("/", {
    schema: {
      response: {
        200: DELETEUsageResponseSchema,
      },
    },
    async handler(request, reply) {
      const usage = await usageMeter.readAndReset();
      reply.status(200).send(usage);
    },
  });

  done();
};

export default usageRoute;
