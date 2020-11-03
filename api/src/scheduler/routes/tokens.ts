import { FastifyPluginCallback } from "fastify";

import POSTTokensParamsSchema from "../schemas/tokens/PUT/params.json";
import { POSTTokensParams } from "../types/tokens/PUT/params";

import DELETETokenParamsSchema from "../schemas/tokens/DELETE/params.json";
import { DELETETokensTokenParams } from "../types/tokens/DELETE/params";

const tokensPlugin: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.addHook("onRequest", fastify.basicAuth);

  fastify.put<{ Params: POSTTokensParams }>("/:id", {
    schema: {
      params: POSTTokensParamsSchema,
    },

    async handler(request, reply) {
      const { id } = request.params;
      const token = await fastify.tokens.create(id);

      fastify.telemetrist?.dispatch("token created");

      reply.status(201).send(token);
    },
  });

  fastify.delete<{ Params: DELETETokensTokenParams }>("/:id", {
    schema: {
      params: DELETETokenParamsSchema,
    },

    async handler(request, reply) {
      const success = await fastify.tokens.revoke(request.params.id);

      fastify.telemetrist?.dispatch("token revoked");

      if (success) {
        reply.status(204);
      } else {
        reply.status(404).send("Not Found");
      }
    },
  });

  done();
};

export default tokensPlugin;
