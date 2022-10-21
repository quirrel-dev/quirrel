import { QuirrelClient, runQuirrel as _runQuirrel } from "../../";
import IORedis from "ioredis-mock";
import http from "http";

function getRandomPort() {
  return 3000 + Math.floor(Math.random() * 1000);
}

export async function runQuirrel({ port = 9181 }: { port?: number } = {}) {
  const ioredis = new IORedis({
    port: getRandomPort(),
  });
  const quirrelServer = await _runQuirrel({
    host: "localhost",
    port,
    logger: "none",
    redisFactory: () => {
      return ioredis.duplicate() as any;
    },
  });

  const receivedJobs: string[] = [];

  const client = new QuirrelClient<string>({
    async handler(payload) {
      receivedJobs.push(payload);
    },
    route: "",
    config: {
      applicationBaseUrl: "http://localhost:6000",
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
    .listen(6000);

  return {
    client,
    receivedJobs,
    async cleanup() {
      await quirrelServer.close();
      receiver.close();
    },
  };
}
