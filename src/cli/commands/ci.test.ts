import { quirrelCI } from "./ci";
import path from "path";
import { run } from "../../api/test/runQuirrel";
import { AddressInfo } from "ws";
import { QuirrelClient } from "../../client";

let teardown: () => Promise<void>;

async function runForDirectory(dir: string) {
  await quirrelCI(path.join(__dirname, dir), {
    dryRun: false,
    production: false,
  });
}

test("quirrel ci", async () => {
  const quirrel = await run("Mock");
  teardown = quirrel.teardown;
  process.env.QUIRREL_BASE_URL = "https://test-url.app";
  process.env.QUIRREL_URL =
    "http://localhost:" + (quirrel.server.address() as AddressInfo).port;

  const client = new QuirrelClient({
    route: "api/fetchDataCron",
    async handler() {},
  });

  // has cron job, so it should be created
  await runForDirectory("../../../examples/next");
  expect(await client.getById("@cron")).not.toBeNull();

  // has no cron jobs, so it should be deleted
  await runForDirectory("../../../examples/blitz");
  expect(await client.getById("@cron")).toBeNull();
});
