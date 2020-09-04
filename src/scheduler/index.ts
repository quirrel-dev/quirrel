import fastify from "fastify";
import redisPlugin from "./redis";
import health from "./routes/health";
import jobs from "./routes/jobs";
import type * as redis from "redis";

export interface QuirrelServerConfig {
    port?: number;
    redis?: redis.ClientOpts;
}

export async function createServer({ port = 3000, redis }: QuirrelServerConfig) {    
    const app = fastify({
        logger: true
    })

    app.register(redisPlugin, redis)
    app.register(health, { prefix: "/health" })
    app.register(jobs, { prefix: "/jobs" })

    await app.listen(port)

    return {
        port,
        async close() {
            app.log.info("Closing.");
            await app.close()
        }
    }
}