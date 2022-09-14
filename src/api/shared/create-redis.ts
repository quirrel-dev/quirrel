import IORedis, { RedisOptions } from "ioredis";
import IORedisMock from "ioredis-mock";
import fs from 'fs';

const fileExists = (path: fs.PathLike) => fs.promises.stat(path).then(() => true, () => false)

export function createRedisFactory(redisUrl?: string, options: RedisOptions ={}): () => IORedis.Redis {
  if (!redisUrl) {
    let redis: IORedisMock | undefined = undefined;
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
      if (process.env.REDIS_TLS_CA_FILE && fs.existsSync(process.env.REDIS_TLS_CA_FILE)) {
        options.tls = {
          ca: fs.readFileSync(process.env.REDIS_TLS_CA_FILE, 'utf8')
        }
      }
      redis = new IORedis(redisUrl, options);
      return redis;
    }

    return redis.duplicate();
  };
}
