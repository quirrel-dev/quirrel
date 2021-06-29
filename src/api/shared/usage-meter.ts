import type { Redis } from "ioredis";
import RedisMock from "ioredis-mock";

export class UsageMeter {
  constructor(private readonly redis: Redis) {}

  async record(tokenId: string) {
    await this.redis.hincrby("usage", tokenId, 1);
  }

  async readAndReset() {
    const result = await this.redis.eval(
      `
      local result = redis.call('HGETALL', KEYS[1])
      redis.call('DEL', KEYS[1])
      return result
      `,
      1,
      "usage"
    );

    if (this.redis instanceof RedisMock) {
      for (const key of Object.keys(result)) {
        result[key] = Number(result[key]);
      }

      return result
    }

    const usage: Record<string, number> = {};

    for (let i = 0; i < result.length; i += 2) {
      const key = result[i];
      const value = Number(result[i + 1]);
      usage[key] = value;
    }

    return usage;
  }
}
