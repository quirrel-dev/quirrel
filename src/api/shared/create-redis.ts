import IORedis from "ioredis";
import IORedisMock from "@quirrel/ioredis-mock";

export function createRedisFactory(redisUrl?: string): () => IORedis.Redis {
  if (!redisUrl) {
    let redis: any | undefined = undefined;
    return () => {
      if (!redis) {
        redis = new IORedisMock();
        return redis;
      }

      return redis.createConnectedClient() as any;
    };
  }

  let redis: IORedis.Redis | undefined = undefined;
  return () => {
    if (!redis) {
      redis = new IORedis(redisUrl);
      return redis;
    }

    return redis.duplicate();
  };
}
