import { Job, QuirrelClient } from "../src";
import { runQuirrel } from "quirrel";
import type { AddressInfo } from "net";
import * as http from "http";
import Redis from "ioredis";

function getAddress(server: http.Server): string {
  const { address, port } = server.address() as AddressInfo;
  return `http://${address}:${port}`;
}

test("getAll", async () => {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.flushall();

  const server = await runQuirrel({
    port: 0,
    redisFactory: () => redis.duplicate(),
    disableTelemetry: true,
    logger: "none",
  });

  const quirrel = new QuirrelClient({
    route: "",
    async handler() {},
    config: {
      quirrelBaseUrl: getAddress(server.httpServer),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      applicationBaseUrl: "http://localhost",
    },
  });

  const jobs = await Promise.all([
    quirrel.enqueue("hello world", {
      delay: 20 * 1000,
    }),
    quirrel.enqueue("hello world", {
      delay: 20 * 1000,
    }),
    quirrel.enqueue("hello world", {
      delay: 20 * 1000,
    }),
  ]);

  const iterator = quirrel.get();

  const { value: fetchedJobs, done } = await iterator.next();

  expect((fetchedJobs as Job<unknown>[]).map((v) => JSON.stringify(v)).sort()).toEqual(
    jobs.map((v) => JSON.stringify(v)).sort()
  );
  expect(done).toBe(false);

  expect((await iterator.next()).done).toBe(true);

  server.close();
});
