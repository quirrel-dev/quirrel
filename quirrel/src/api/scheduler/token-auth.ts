import {
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
  preValidationHookHandler,
} from "fastify";
import fp from "fastify-plugin";
import { IncomingMessage, IncomingHttpHeaders } from "http";
import { UsageMeter } from "../shared/usage-meter";
import basicAuth from "basic-auth";
import jwt from "jsonwebtoken";

interface TokenAuthService {
  authenticate(
    request: FastifyRequest | IncomingMessage
  ): Promise<string | null>;
}

declare module "fastify" {
  interface FastifyInstance {
    tokenAuth: TokenAuthService;
    tokenAuthPreValidation: preValidationHookHandler;
  }

  interface FastifyRequest {
    tokenId: string;
  }
}

interface TokenAuthPluginOpts {
  enable: boolean;
  passphrases: string[];
  jwtPublicKey?: string;
}

const tokenAuthServicePlugin: FastifyPluginCallback<TokenAuthPluginOpts> = (
  fastify,
  opts,
  done
) => {
  fastify.decorateRequest("tokenId", null);
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

  function decorateTokenAuth(service: TokenAuthService) {
    fastify.decorate("tokenAuth", service);
  }

  if (!opts.enable) {
    decorateTokenAuth({
      async authenticate() {
        return "anonymous";
      },
    });

    return done();
  }

  async function checkJwt(
    token: string
  ): Promise<["not_a_jwt"] | ["success", string] | ["invalid"]> {
    const { jwtPublicKey } = opts;
    if (!jwtPublicKey) {
      return ["not_a_jwt"];
    }

    return await new Promise<["not_a_jwt"] | ["success", string] | ["invalid"]>(
      (resolve) => {
        jwt.verify(token, jwtPublicKey, (err, result) => {
          if (err) {
            return resolve(["invalid"]);
          }

          const { sub } = result as { sub?: string };
          if (sub) {
            resolve(["success", sub]);
          } else {
            resolve(["invalid"]);
          }
        });
      }
    );
  }

  async function getTokenID(headers: IncomingHttpHeaders) {
    const { authorization } = headers;
    if (!authorization) {
      return null;
    }

    if (authorization.startsWith("Bearer ")) {
      const [_, token] = authorization.split("Bearer ");
      const [result, jwtTokenId] = await checkJwt(token);
      switch (result) {
        case "not_a_jwt":
          break;
        case "invalid":
          return null;
        case "success":
          return { tokenId: jwtTokenId!, countUsage: true };
      }

      const redisTokenId = await fastify.tokens?.check(token);
      if (redisTokenId) {
        return { tokenId: redisTokenId, countUsage: true };
      }

      return null;
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

  const usageMeter = new UsageMeter(fastify.redis);

  decorateTokenAuth({
    async authenticate(request) {
      const result = await getTokenID(request.headers);
      if (!result) {
        return null;
      }

      const { tokenId, countUsage } = result;

      if (countUsage) {
        usageMeter.record(tokenId);
      }

      return tokenId;
    },
  });

  return done();
};

export default (fp as any)(
  tokenAuthServicePlugin
) as FastifyPluginCallback<TokenAuthPluginOpts>;
