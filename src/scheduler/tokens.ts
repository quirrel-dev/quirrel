import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin";
import * as uuid from "uuid";

interface PublicTokensService {
  check(token: string): Promise<string | null>;
  create(id: string): Promise<string>;
  delete(token: string): Promise<boolean>;
}

declare module "fastify" {
  interface FastifyInstance {
    tokens: PublicTokensService;
  }
}

const TOKEN_ID = "tokens:token-id";
const ID_TOKEN = "tokens:id-token";

const tokensPlugin: FastifyPluginCallback = async (fastify, opts, done) => {
  function createToken(id: string) {
    return new Promise<string>((resolve, reject) => {
      const token = uuid.v4();
      fastify.redis.EVAL(
        `
        redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
        redis.call('HSET', KEYS[2], ARGV[2], ARGV[1])
        `,
        2,
        TOKEN_ID,
        ID_TOKEN,
        token,
        id,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(token);
          }
        }
      );
    });
  }

  function check(token: string) {
    return new Promise<string | null>((resolve, reject) => {
      fastify.redis.HGET(TOKEN_ID, token, (err, result) => {
        if (err) {
          reject(err);
        } else {
          if (result) {
            resolve(result);
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  function revokeToken(id: string) {
    return new Promise<boolean>((resolve, reject) => {
      fastify.redis.EVAL(
        `
        local token = redis.call('HGET', KEYS[2], ARGV[1])
        if (not token) then
          return false
        end

        redis.call('HDEL', KEYS[2], ARGV[1])
        redis.call('HDEL', KEYS[1], token)
        return 1
        `,
        2,
        TOKEN_ID,
        ID_TOKEN,
        id,
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!result);
          }
        }
      );
    });
  }

  fastify.decorate("tokens", {
    check,
    create: createToken,
    delete: revokeToken,
  });

  done();
};

export default (fp as any)(tokensPlugin);
