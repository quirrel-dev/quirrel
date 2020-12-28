import type { Redis } from "ioredis";
import { JobsRepo } from "./jobs-repo";

export class QueueRepo {
  constructor(
    private readonly redis: Redis,
    private readonly jobsRepo: JobsRepo
  ) {}

  public async add(endpoint: string, tokenId: string) {
    await this.redis.sadd(`queues:by-token:${tokenId}`, endpoint);
  }

  public async get(tokenId: string) {
    await this.ensureMigrated(tokenId);

    return await this.redis.smembers(`queues:by-token:${tokenId}`);
  }

  private async ensureMigrated(tokenId: string) {
    const isMigrated = await this.redis.exists(
      `queues:by-token:${tokenId}:is-migrated`
    );
    if (isMigrated) {
      return;
    }

    const endpoints: string[] = [];

    let cursor = 0;
    do {
      const result = await this.jobsRepo.findByTokenId(tokenId, {
        count: 1000,
        cursor: 0,
      });

      cursor = result.cursor;
      endpoints.push(...result.jobs.map((j) => j.endpoint));
    } while (cursor !== 0);

    await this.redis.sadd(`queues:by-token:${tokenId}`, ...endpoints);
    await this.redis.set(`queues:by-token:${tokenId}:is-migrated`, "ture");
  }
}
