import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin";
import * as uuid from "uuid";

interface TokenPayload {
  projectId: string;
}

interface PublicTokensService {
  check(token: string): Promise<TokenPayload | null>;
  create(payload: TokenPayload): Promise<string>;
  delete(token: string): Promise<boolean>;
}

declare module "fastify" {
  interface FastifyInstance {
    tokens: PublicTokensService;
  }
}

const TOKENS = "tokens";

const tokensPlugin: FastifyPluginCallback = async (
  fastify,
  opts,
  done
) => {
  function createToken(payload: TokenPayload) {
    return new Promise<string>((resolve, reject) => {
      const token = uuid.v4();
      fastify.redis.HSET(TOKENS, token, JSON.stringify(payload), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      });
    });
  }

  function check(token: string) {
    return new Promise<TokenPayload | null>((resolve, reject) => {
      fastify.redis.HGET(TOKENS, token, (err, result) => {
        if (err) {
          reject(err);
        } else {
          if (result) {
            resolve(JSON.parse(result));
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  function deleteToken(token: string) {
    return new Promise<boolean>((resolve, reject) => {
      fastify.redis.HDEL(TOKENS, token, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result > 0);
        }
      });
    });
  }

  fastify.decorate("tokens", {
    check,
    create: createToken,
    delete: deleteToken
  });

  done();
};

export default (fp as any)(tokensPlugin);
