import type * as redis from "redis";

export class UsageMeter {

    constructor(private readonly redis: redis.RedisClient) {}

    record(projectId: string) {
        return new Promise<void>((resolve, reject) => {{
            this.redis.HINCRBY("usage", projectId, 1, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve();
                }
            })
        }})
    }

    readAndReset() {
        return new Promise<Record<string, number>>((resolve, reject) => {
            this.redis.EVAL(`
                local result = redis.call('HGETALL', KEYS[0])
                redis.call('DEL', KEYS[0])
                return result
            `, 1, "usage", (err, result) => {
                if (err) {
                    reject(err)
                } else {
                    for (const key in Object.keys(result)) {
                        result[key] = Number(result[key])
                    }

                    resolve(result);
                }
            })
        })
    }

} 