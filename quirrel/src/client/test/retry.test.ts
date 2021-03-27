import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./ms.test";
import http from "http";
import type { AddressInfo } from "net";
import { expectToBeInRange, makeSignal } from "./util";

test("retry", async () => {
  const server = await run("Mock");

  let tries = 0;
  const $tries = makeSignal();

  const receiver = http
    .createServer((req, res) => {
      $tries.signal("" + ++tries);
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

  const enqueueDate = Date.now();
  await quirrel.enqueue("hello world", {
    retry: ["10ms", "100ms", "200ms"],
    id: "retry",
  });

  await $tries("2");
  const secondTry = Date.now();

  const jobAfterFirstRetry = await quirrel.getById("retry");
  const nextIteration = jobAfterFirstRetry?.count;
  expect(nextIteration).toBe(3);
  expectToBeInRange(secondTry - enqueueDate, [5, 50]);

  await $tries("4");
  const lastTry = Date.now();
  expect(tries).toBe(4);
  expectToBeInRange(lastTry - enqueueDate, [195, 220]);

  const jobAfterAllRetries = await quirrel.getById("retry");
  expect(jobAfterAllRetries).toBeNull();

  server.teardown();
  receiver.close();
});
