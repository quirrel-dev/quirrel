import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./util";

test("getById", async () => {
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

  const job = await quirrel.enqueue("hello world", { delay: "10s" });

  const fetchedJob = await quirrel.getById(job.id);
  expect(JSON.stringify(fetchedJob)).toEqual(JSON.stringify(job));

  const nonExistantJob = await quirrel.getById("nonexistant");
  expect(nonExistantJob).toBe(null);

  server.teardown();
});

test("uri-encoding", async () => {
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

  await quirrel.enqueue("hello world", {
    delay: "10s",
    id: "@something",
  });

  expect(await quirrel.getById("%40something")).toBeNull();
  expect(await quirrel.getById("@something")).not.toBeNull();

  server.teardown();
});
