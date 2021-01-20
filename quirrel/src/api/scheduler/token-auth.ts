import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { IncomingMessage, IncomingHttpHeaders } from "http";
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

  async function getTokenID(headers: IncomingHttpHeaders) {
    const { authorization } = headers;
    if (!authorization) {
      return null;
    }

    if (authorization.startsWith("Bearer ")) {
      const [_, token] = authorization.split("Bearer ");
      const tokenId = await fastify.tokens.check(token);
      if (!tokenId) {
        return null;
      }
      return { tokenId, countUsage: true };
    } else if (authorization.startsWith("Basic ")) {
      const basicCredentials = basicAuth.parse(authorization);

      if (!basicCredentials) {
        return null;
      }

      const isRootUser = opts.passphrases.includes(basicCredentials.pass);
      if (isRootUser) {
        const countUsage = !!headers["x-quirrel-count-usage"];
        return { tokenId: basicCredentials.name, countUsage };
      }
    }

    return null;
  }

  async function authenticate(
    request: FastifyRequest | IncomingMessage
  ): Promise<string | null> {
    if (opts.auth) {
      const result = await getTokenID(request.headers);
      if (!result) {
        return null;
      }

      const { tokenId, countUsage } = result;

      if (countUsage) {
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
