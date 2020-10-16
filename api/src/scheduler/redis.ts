import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin";
import * as Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis.Redis;
  }
}

interface RedisPluginOpts {
  opts?: Redis.RedisOptions | string;
}

const redisPlugin: FastifyPluginCallback<RedisPluginOpts> = (
  fastify,
  { opts },
  done
) => {
  const client = new Redis(opts as any);
  fastify.decorate("redis", client);

  fastify.addHook("onClose", async () => {
    await client.quit();
  });

  client.addListener("ready", done);
};

export default (fp as any)(redisPlugin) as FastifyPluginCallback<
  RedisPluginOpts
>;
