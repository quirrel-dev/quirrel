import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { IncomingMessage } from "http";
import { UsageMeter } from "../shared/usage-meter";
import basicAuth from "basic-auth";

interface TokenAuthService {
  authenticate(
    request: FastifyRequest | IncomingMessage
  ): Promise<string | null>;
}

declare module "fastify" {
  interface FastifyInstance {
    tokenAuth: TokenAuthService;
    tokenAuthPreValidation: any;
  }

  interface FastifyRequest {
    tokenId: string;
  }
}

interface TokenAuthPluginOpts {
  auth: boolean;
  passphrases: string[];
}

const tokenAuthServicePlugin: FastifyPluginCallback<TokenAuthPluginOpts> = (
  fastify,
  opts,
  done
) => {
  const usageMeter = new UsageMeter(fastify.redis);

  async function getTokenID(authorizationHeader?: string) {
    if (!authorizationHeader) {
      return null;
    }

    if (authorizationHeader.startsWith("Bearer ")) {
      const [_, token] = authorizationHeader.split("Bearer ");
      const tokenId = await fastify.tokens.check(token);
      return tokenId;
    } else if (authorizationHeader.startsWith("Basic ")) {
      const basicCredentials = basicAuth.parse(authorizationHeader);

      if (!basicCredentials) {
        return null;
      }

      const isRootUser = opts.passphrases.includes(basicCredentials.pass);
      if (isRootUser) {
        return basicCredentials.name;
      }
    }

    return null;
  }

  async function authenticate(
    request: FastifyRequest | IncomingMessage
  ): Promise<string | null> {
    if (opts.auth) {
      const { authorization } = request.headers;
      const tokenId = await getTokenID(authorization);

      if (tokenId) {
        usageMeter.record(tokenId);
      }

      return tokenId;
    }

    return "anonymous";
  }

  const service: TokenAuthService = {
    authenticate,
  };

  fastify.decorateRequest("tokenId", null);
  fastify.decorate("tokenAuth", service);

  fastify.decorate(
    "tokenAuthPreValidation",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tokenId = await fastify.tokenAuth.authenticate(request);

      if (tokenId === null) {
        reply.status(401).send("Unauthenticated");
      } else {
        request.tokenId = tokenId;
      }
    }
  );

  done();
};

export default (fp as any)(tokenAuthServicePlugin) as FastifyPluginCallback<
  TokenAuthPluginOpts
>;
