import IoRedis, { RedisOptions as OriginalRedisOptions } from "ioredis";
import fs from "fs";
const IoRedisMock: typeof IoRedis = require('ioredis-mock');

type RedisOptions = OriginalRedisOptions & {
  tlsCa?: { path?: string; base64?: string };
};

export function createRedisFactory(
  redisUrl?: string,
  options: RedisOptions = {}
): () => IoRedis {
  if (!redisUrl) {
    let redis: IoRedis | undefined = undefined;
    return () => {
      if (!redis) {
        redis = new IoRedisMock();
        return redis;
      }

      return redis.duplicate();
    };
  }

  let redis: IoRedis | undefined = undefined;
  return () => {
    if (!redis) {
      if (options.tlsCa?.path && fs.existsSync(options.tlsCa.path)) {
        options.tls = {
          ...options.tls,
          ca: fs.readFileSync(options.tlsCa.path, "utf8"),
        };
      }
      if (options.tlsCa?.base64) {
        options.tls = {
          ...options.tls,
          ca: Buffer.from(options.tlsCa?.base64, "base64").toString("ascii"),
        };
      }
      redis = new IoRedis(redisUrl, options);
      return redis;
    }

    return redis.duplicate();
  };
}
