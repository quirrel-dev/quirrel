import IORedis from "ioredis";
import IORedisMock from "ioredis-mock";
import fs from 'fs';

type RedisOptions = IORedis.RedisOptions & { 
  tls?: (
    Omit<IORedis.RedisOptions["tls"], 'ca'> & { caPath?: string, caBase64?: never } | 
    Omit<IORedis.RedisOptions["tls"], 'ca'> & { caPath?: never, caBase64?: string } |
    IORedis.RedisOptions["tls"] & { caPath: never, caBase64: never } 
  )
};

export function createRedisFactory(redisUrl?: string, options: RedisOptions = {}): () => IORedis.Redis {
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
      if (options.tls?.caPath && fs.existsSync(options.tls.caPath)) {
        const { caPath, ...tls } = options.tls;
        options.tls = {
          ...tls,
          ca: fs.readFileSync(options.tls.caPath, 'utf8'),
        };
      }
      if (options.tls?.caBase64) {
        const { caBase64, ...tls } = options.tls;
        options.tls = {
          ...tls,
          ca: Buffer.from(caBase64, 'base64').toString('ascii'),
        };
      }
      redis = new IORedis(redisUrl, options);
      return redis;
    }

    return redis.duplicate();
  };
}
