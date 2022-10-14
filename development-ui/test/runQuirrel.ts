import { QuirrelClient, runQuirrel as _runQuirrel } from "../../dist/cjs/src";
import http from "http";
import IoRedis, { RedisOptions as OriginalRedisOptions } from "ioredis";
const IoRedisMock: typeof IoRedis = require('ioredis-mock');

export async function runQuirrel({ port = 9181 }: { port?: number } = {}) {
  let redis: IoRedis | undefined = undefined;

  const quirrelServer = await _runQuirrel({
    port,
    logger: "none",
    redisFactory: () => {
      if (!redis) {
        redis = new IoRedisMock();
        return redis;
      }
      return redis.duplicate();
    },
  });

  const receivedJobs: string[] = [];

  const client = new QuirrelClient<string>({
    async handler(payload) {
      receivedJobs.push(payload);
    },
    route: "",
    config: {
      applicationBaseUrl: "http://localhost:5000",
      quirrelBaseUrl: "http://localhost:" + port,
    },
  });

  const receiver = http
    .createServer((req, res) => {
      let body = "";
      req.on("data", (data) => {
        body += data;
      });

      req.on("end", async () => {
        const response = await client.respondTo(body, req.headers);
        res.statusCode = response.status;
        for (const [name, value] of Object.entries(response.headers)) {
          res.setHeader(name, value);
        }
        res.write(body);
        res.end();
      });
    })
    .listen({ port: 5000 });

  return {
    client,
    receivedJobs,
    async cleanup() {
      await quirrelServer.close();
      receiver.close();
    },
  };
}
