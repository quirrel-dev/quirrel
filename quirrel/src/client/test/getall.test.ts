import { Job, QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./ms.test";

test("getAll", async () => {
  const server = await run("Mock");

  const quirrel = new QuirrelClient({
    route: "",
    async handler() {},
    config: {
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      applicationBaseUrl: "http://localhost",
    },
  });

  const jobs = await quirrel.enqueueMany([
    [
      "hello world",
      {
        delay: "20s",
      },
    ],
    [
      "hello world",
      {
        delay: "20s",
      },
    ],
    [
      "hello world",
      {
        delay: "20s",
      },
    ],
  ]);

  const iterator = quirrel.get();

  const { value: fetchedJobs, done } = await iterator.next();

  expect(
    (fetchedJobs as Job<unknown>[]).map((v) => JSON.stringify(v)).sort()
  ).toEqual(jobs.map((v) => JSON.stringify(v)).sort());
  expect(done).toBe(false);

  expect((await iterator.next()).done).toBe(true);

  server.teardown();
});
