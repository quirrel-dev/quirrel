import { FastifyPluginCallback } from "fastify";

import type { POSTTokensParams } from "../types/tokens/PUT/params.js";
import type { DELETETokensTokenParams } from "../types/tokens/DELETE/params.js";

import { readFileSync } from "fs"
import { join } from "path"

const POSTTokensParamsSchema = JSON.parse(
  readFileSync(join(import.meta.url, "..", "..","schemas","tokens","PUT","params.json"), "utf-8")
)

const DELETETokenParamsSchema = JSON.parse(
  readFileSync(join(import.meta.url, "..", "..","schemas","tokens","DELETE","params.json"), "utf-8")
)


const tokensPlugin: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.addHook("onRequest", fastify.basicAuth);

  const baseSchema = {
    tags: ["Admin"],
    security: [
      {
        Admin: [],
      },
    ],
  };

  fastify.put<{ Params: POSTTokensParams }>("/:id", {
    schema: {
      ...baseSchema,
      params: POSTTokensParamsSchema,
      summary: "Issue new token",
    },

    async handler(request, reply) {
      const { id } = request.params;
      const token = await fastify.tokens!.create(id);

      fastify.telemetrist?.dispatch("token created");

      reply.status(201).send(token);
    },
  });

  fastify.delete<{ Params: DELETETokensTokenParams }>("/:id", {
    schema: {
      ...baseSchema,
      params: DELETETokenParamsSchema,
      summary: "Revoke token",
    },

    async handler(request, reply) {
      const tokenId = request.params.id;
      const success = await fastify.tokens!.revoke(tokenId);

      fastify.telemetrist?.dispatch("token revoked");

      if (success) {
        await fastify.jobs.emptyToken(tokenId);
        reply.status(204);
      } else {
        reply.status(404).send("Not Found");
      }
    },
  });

  done();
};

export default tokensPlugin;
