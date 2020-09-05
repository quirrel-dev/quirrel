import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin";
import * as uuid from "uuid";
import fastifyBasicAuth from "fastify-basic-auth";

import * as POSTTokensBodySchema from "../schemas/tokens/POST/body.json";
import { POSTTokensBody } from "../types/tokens/POST/body";

import * as DELETETokenParamsSchema from "../schemas/tokens/DELETE/params.json";
import { DELETETokensTokenParams } from "../types/tokens/DELETE/params";

interface TokensPluginOpts {
  passphrases: string[];
}

const TOKENS = "tokens";

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

    fastify.post<{ Body: POSTTokensBody }>("/", {
      schema: {
        body: {
          data: POSTTokensBodySchema,
        },
      },

      async handler(request, reply) {
        const { projectId } = request.body;

        const token = await fastify.tokens.create({ projectId });

        reply.status(201).send(token);
      },
    });

    fastify.delete<{ Params: DELETETokensTokenParams }>("/:token", {
      schema: {
        params: {
          data: DELETETokenParamsSchema,
        },
      },

      async handler(request, reply) {
        const success = await fastify.tokens.delete(request.params.token);
        reply.status(success ? 200 : 404);
      },
    });
  });

  done();
};

export default tokensPlugin;
