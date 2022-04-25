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

test("quirrel ci migration", async () => {
  const quirrelOld = await run("Mock", {
    port: 0,
  });

  process.env.QUIRREL_API_URL = getAddress(quirrelOld.server);
  await runForDirectory("../../../examples/next");

  const oldCron = await quirrelOld.app.app.jobs.findAll({ cursor: 0 });
  expect(oldCron.cursor).toEqual(0);
  expect(oldCron.jobs).toHaveLength(2);

  const quirrelNew = await run("Mock", {
    port: 0,
  });

  process.env.QUIRREL_MIGRATE_OLD_API_URL = getAddress(quirrelOld.server);
  process.env.QUIRREL_API_URL = getAddress(quirrelNew.server);
  await runForDirectory("../../../examples/next");

  const oldCronEmpty = await quirrelOld.app.app.jobs.findAll({ cursor: 0 });
  expect(oldCronEmpty.cursor).toEqual(0);
  expect(oldCronEmpty.jobs).toHaveLength(0);

  const newCron = await quirrelNew.app.app.jobs.findAll({ cursor: 0 });
  expect(newCron.cursor).toEqual(0);
  expect(newCron.jobs).toHaveLength(2);

  await quirrelOld.teardown();
  await quirrelNew.teardown();
});
