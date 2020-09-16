import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin";

import * as Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis.Redis;
  }
}

const redisPlugin: FastifyPluginCallback<{
  opts: Redis.RedisOptions | string;
}> = async (fastify, { opts }, done) => {
  const client = new Redis(opts as any);
  fastify.decorate("redis", client);

  fastify.addHook("onClose", async (instance, done) => {
    await client.quit();
    done();
  });

  client.addListener("ready", () => {
    done();
  });
};

export default (fp as any)(redisPlugin);
