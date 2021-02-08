import delay from "delay";
import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./ms.test";
import http from "http";
import type { AddressInfo } from "net";

test("retry", async () => {
  const server = await run("Mock");

  let tries = 0;

  const receiver = http
    .createServer((req, res) => {
      tries++;
      res.statusCode = 500;
      res.end();
    })
    .listen(0);

  const { port } = receiver.address() as AddressInfo;

  const quirrel = new QuirrelClient({
    route: "",
    async handler() {},
    config: {
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      applicationBaseUrl: `http://localhost:${port}`,
    },
  });

  await quirrel.enqueue("hello world", {
    retry: ["10ms", "100ms", "200ms"],
    id: "retry",
  });

  await delay(50);
  const jobAfterFirstRetry = await quirrel.getById("retry");
  const nextIteration = jobAfterFirstRetry?.count;
  expect(nextIteration).toBe(3);

  await delay(180);
  expect(tries).toBe(4);
  const jobAfterAllRetries = await quirrel.getById("retry");
  expect(jobAfterAllRetries).toBeNull();

  server.teardown();
  receiver.close();
});
