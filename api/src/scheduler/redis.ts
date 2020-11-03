import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { Redis } from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
    redisFactory: () => Redis;
  }
}

interface RedisPluginOpts {
  redisFactory: () => Redis;
}

const redisPlugin: FastifyPluginCallback<RedisPluginOpts> = (
  fastify,
  { redisFactory },
  done
) => {
  const client = redisFactory();
  fastify.decorate("redis", client);
  fastify.decorate("redisFactory", redisFactory);

  fastify.addHook("onClose", async () => {
    await client.quit();
  });

  client.addListener("ready", done);
};

export default (fp as any)(redisPlugin) as FastifyPluginCallback<
  RedisPluginOpts
>;
