import { QuirrelClient } from "../src";
import { runQuirrel } from "quirrel";
import type { AddressInfo } from "net";
import * as http from "http";
import delay from "delay";
import Redis from "ioredis";

export function getAddress(server: http.Server): string {
  let { address, port } = server.address() as AddressInfo;

  if (address === "::") {
    address = "localhost";
  }

  return `http://${address}:${port}`;
}

test("encryption", async () => {
  const server = await runQuirrel({
    port: 0,
    redisFactory: () => new Redis(process.env.REDIS_URL),
    disableTelemetry: true,
    logger: "none",
  });

  const bodies: string[] = [];

  const endpoint = http
    .createServer((req) => {
      let body = "";
      req.on("data", (data) => {
        body += data;
      });
      req.on("end", () => {
        bodies.push(body);
      });
    })
    .listen(0);

  const quirrel = new QuirrelClient({
    async handler() {},
    route: "",
    config: {
      quirrelBaseUrl: getAddress(server.httpServer),
      applicationBaseUrl: getAddress(endpoint),
    },
  });

  await quirrel.enqueue("hello world", {
    delay: "1s",
  });

  await delay(1500);

  expect(bodies).toHaveLength(1);

  server.close();
  endpoint.close();
});
