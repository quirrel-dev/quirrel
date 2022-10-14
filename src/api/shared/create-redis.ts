import IORedis from "ioredis";
import IORedisMock from "ioredis-mock";
import fs from "fs";

type RedisOptions = IORedis.RedisOptions & {
  tlsCa?: { path?: string; base64?: string };
};

export function createRedisFactory(
  redisUrl?: string,
  options: RedisOptions = {}
): () => IORedis.Redis {
  if (!redisUrl) {
    let redis: IORedis.Redis | undefined = undefined;
    return () => {
      if (!redis) {
        redis = new IORedisMock();
        return redis;
      }

      return redis.duplicate();
    };
  }

  let redis: IORedis.Redis | undefined = undefined;
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
      redis = new IORedis(redisUrl, options);
      return redis;
    }

    return redis.duplicate();
  };
}
