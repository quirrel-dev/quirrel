import { Redis } from "ioredis";
import { POSTQueuesEndpointBody } from "./types/queues/POST/body";

type RepeatableOpts = NonNullable<POSTQueuesEndpointBody["repeat"]>;

export class RepeatableRegistry {
  constructor(private readonly redis: Redis) {}

  private computeExpiry({ every, limit }: RepeatableOpts) {
    return every * limit * 1.1;
  }

  async register(
    id: string,
    repeatableKey: string,
    repeatableOpts: RepeatableOpts
  ) {
    await this.redis.set(
      `repeatables:${id}`,
      repeatableKey
    );
  }

  async remove(id: string) {
    await this.redis.del(`repeatables:${id}`);
  }

  async get(id: string): Promise<string | null> {
    return await this.redis.get(`repeatables:${id}`);
  }
}
