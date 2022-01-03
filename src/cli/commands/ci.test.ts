import { quirrelCI } from "./ci";
import path from "path";
import { run } from "../../api/test/runQuirrel";
import { QuirrelClient } from "../../client";
import { getAddress } from "../../client/test/util";

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
  process.env.QUIRREL_BASE_URL = "https://test-url.app/";
  process.env.QUIRREL_URL = getAddress(quirrel.server);

  const client = new QuirrelClient({
    route: "api/fetchDataCron",
    async handler() {},
  });

  const greetGarfieldClient = new QuirrelClient({
    route: "api/greetGarfieldCron",
    async handler() {},
  });

  async function runNext() {
    await runForDirectory("../../../examples/next");
    const job = await client.getById("@cron");
    expect(job?.repeat?.cronTimezone).toBe("Europe/Stockholm");

    const garfieldJob = await greetGarfieldClient.getById("@cron");
    expect(garfieldJob?.repeat?.cronTimezone).toBe("Etc/UTC");
  }

  // has cron job, so it should be created
  await runNext();

  // second run, nothing should change
  await runNext();

  // has no cron jobs, so it should be deleted
  await runForDirectory("../../../examples/blitz");
  expect(await client.getById("@cron")).toBeNull();
  expect(await greetGarfieldClient.getById("@cron")).toBeNull();

  teardown();
});
