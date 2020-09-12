import type * as redis from "redis";

export class UsageMeter {
  constructor(private readonly redis: redis.RedisClient) {}

  record(tokenId: string) {
    return new Promise<void>((resolve, reject) => {
      this.redis.HINCRBY("usage", tokenId, 1, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  readAndReset() {
    return new Promise<Record<string, number>>((resolve, reject) => {
      this.redis.EVAL(
        `
        local result = redis.call('HGETALL', KEYS[1])
        redis.call('DEL', KEYS[1])
        return result
        `,
        1,
        "usage",
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            const usage: Record<string, number> = {};

            for (let i = 0; i < result.length; i += 2) {
              const key = result[i];
              const value = Number(result[i + 1]);
              usage[key] = value;
            }

            resolve(usage);
          }
        }
      );
    });
  }
}
