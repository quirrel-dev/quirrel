import type * as redis from "redis";
import * as uuid from "uuid";

const TOKEN_ID = "tokens:token-id";
const ID_TOKEN = "tokens:id-token";

export class TokenRepo {
  constructor(private readonly redis: redis.RedisClient) {}

  create(id: string) {
    return new Promise<string>((resolve, reject) => {
      const token = uuid.v4();
      this.redis.EVAL(
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

  getById(id: string) {
    return new Promise<string | null>((resolve, reject) => {
      this.redis.HGET(ID_TOKEN, id, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  check(token: string) {
    return new Promise<string | null>((resolve, reject) => {
      this.redis.HGET(TOKEN_ID, token, (err, result) => {
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

  revoke(id: string) {
    return new Promise<boolean>((resolve, reject) => {
      this.redis.EVAL(
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
}
