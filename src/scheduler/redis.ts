import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin"

import * as redis from "redis"

declare module "fastify" {
    interface FastifyInstance {
        redis: redis.RedisClient;
    }
}

const redisPlugin: FastifyPluginCallback<redis.ClientOpts> = async (fastify, opts, done) => {
    fastify.decorate("redis", redis.createClient(opts));

    fastify.addHook("onClose", (instance, done) => {
        fastify.redis.quit(() => {
            done();
        })
    })

    done();
}

export default (fp as any)(redisPlugin);