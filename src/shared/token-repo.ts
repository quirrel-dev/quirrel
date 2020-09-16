import type { Redis } from "ioredis";
import * as uuid from "uuid";

const TOKEN_ID = "tokens:token-id";
const ID_TOKEN = "tokens:id-token";

export class TokenRepo {
  constructor(private readonly redis: Redis) {}

  async create(id: string) {
    const token = uuid.v4();

    await this.redis.eval(
      `
      redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
      redis.call('HSET', KEYS[2], ARGV[2], ARGV[1])
      `,
      2,
      TOKEN_ID,
      ID_TOKEN,
      token,
      id
    );

    return token;
  }

  async getById(id: string) {
    return await this.redis.hget(ID_TOKEN, id);
  }

  async check(token: string) {
    return await this.redis.hget(TOKEN_ID, token);
  }

  async revoke(id: string) {
    const result = await this.redis.eval(
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
      id
    );

    return !!result;
  }
}
