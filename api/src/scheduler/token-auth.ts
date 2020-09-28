import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import * as fp from "fastify-plugin";
import { IncomingMessage } from "http";
import { UsageMeter } from "../shared/usage-meter";

interface TokenAuthService {
  authenticate(
    request: FastifyRequest | IncomingMessage,
    reply?: FastifyReply
  ): Promise<[tokenId: string, done: boolean]>;
}

declare module "fastify" {
  interface FastifyInstance {
    tokenAuth: TokenAuthService;
  }
}

interface TokenAuthPluginOpts {
  auth: boolean;
}

const tokenAuthPlugin: FastifyPluginCallback<TokenAuthPluginOpts> = async (
  fastify,
  opts,
  done
) => {
  const usageMeter = new UsageMeter(fastify.redis);

  async function getTokenID(authorizationHeader?: string) {
    if (!authorizationHeader) {
      return undefined;
    }

    if (!authorizationHeader.startsWith("Bearer ")) {
      return undefined;
    }

    const [_, token] = authorizationHeader.split("Bearer ");
    const tokenId = await fastify.tokens.check(token);
    return tokenId ?? undefined;
  }

  async function authenticate(
    request: FastifyRequest | IncomingMessage,
    reply?: FastifyReply
  ): Promise<[tokenId: string, done: boolean]> {
    if (opts.auth) {
      const { authorization } = request.headers;
      const tokenId = await getTokenID(authorization);

      if (!tokenId) {
        reply?.status(401).send("Unauthorized");

        return ["unauthorized", true];
      }

      usageMeter.record(tokenId);

      return [tokenId, false];
    }

    return ["anonymous", false];
  }

  const service: TokenAuthService = {
    authenticate,
  };

  fastify.decorate("tokenAuth", service);

  done();
};

export default (fp as any)(tokenAuthPlugin);
