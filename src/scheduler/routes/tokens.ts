import { FastifyPluginCallback } from "fastify";
import fastifyBasicAuth from "fastify-basic-auth";

import * as POSTTokensParamsSchema from "../schemas/tokens/PUT/params.json";
import { POSTTokensParams } from "../types/tokens/PUT/params";

import * as DELETETokenParamsSchema from "../schemas/tokens/DELETE/params.json";
import { DELETETokensTokenParams } from "../types/tokens/DELETE/params";

interface TokensPluginOpts {
  passphrases: string[];
}

const tokensPlugin: FastifyPluginCallback<TokensPluginOpts> = async (
  fastify,
  opts,
  done
) => {
  fastify.register(fastifyBasicAuth, {
    validate(username, password, req, reply, done) {
      if (opts.passphrases.includes(password)) {
        done();
      } else {
        done(new Error("Wrong Passphrase"));
      }
    },
  });

  fastify.after(() => {
    fastify.addHook("onRequest", fastify.basicAuth);

    fastify.put<{ Params: POSTTokensParams }>("/:id", {
      schema: {
        params: {
          data: POSTTokensParamsSchema,
        },
      },

      async handler(request, reply) {
        const { id } = request.params;

        const token = await fastify.tokens.create(id);

        reply.status(201).send(token);
      },
    });

    fastify.delete<{ Params: DELETETokensTokenParams }>("/:id", {
      schema: {
        params: {
          data: DELETETokenParamsSchema,
        },
      },

      async handler(request, reply) {
        const success = await fastify.tokens.delete(request.params.id);
        if (success) {
          reply.status(204);
        } else {
          reply.status(404).send("Not Found");
        }
      },
    });
  });

  done();
};

export default tokensPlugin;
