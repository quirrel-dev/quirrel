import { Job, QuirrelClient } from "../src";
import { runQuirrel } from "quirrel";
import type { AddressInfo } from "net";
import fetch from "node-fetch";
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
    redis: process.env.REDIS_URL,
  });

  const quirrel = new QuirrelClient({
    baseUrl: getAddress(server.httpServer),
    async fetcher(req) {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      return {
        body: await res.text(),
        headers: res.headers as any,
        status: res.status,
      };
    },
    encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
  });

  const jobs = await Promise.all([
    quirrel.enqueue("http://localhost", {
      body: "hello world",
      delay: 20 * 1000,
    }),
    quirrel.enqueue("http://localhost", {
      body: "hello world",
      delay: 20 * 1000,
    }),
    quirrel.enqueue("http://localhost", {
      body: "hello world",
      delay: 20 * 1000,
    }),
  ]);

  const iterator = quirrel.get("http://localhost");

  const { value: fetchedJobs, done } = await iterator.next();

  expect((fetchedJobs as Job[]).map((v) => JSON.stringify(v)).sort()).toEqual(
    jobs.map((v) => JSON.stringify(v)).sort()
  );
  expect(done).toBe(false);

  expect((await iterator.next()).done).toBe(true);

  server.close();
});
