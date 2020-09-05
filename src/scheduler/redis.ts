import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin"

import * as redis from "redis"

declare module "fastify" {
    interface FastifyInstance {
        redis: redis.RedisClient;
    }
}

const redisPlugin: FastifyPluginCallback<{ opts: redis.ClientOpts | string }> = async (fastify, { opts }, done) => {
    const client = redis.createClient(opts as any)
    fastify.decorate("redis", client);

    fastify.addHook("onClose", (instance, done) => {
        fastify.redis.quit(() => {
            done();
        })
    })

    client.addListener("ready", () => {
        done();
    })
}

export default (fp as any)(redisPlugin);