import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./util";

test("cron timezone", async () => {
  const server = await run("Mock");

  const quirrel = new QuirrelClient({
    route: "",
    async handler() {},
    config: {
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      applicationBaseUrl: `http://localhost:1234`,
    },
  });

  const job = await quirrel.enqueue(null, {
    repeat: {
      cron: ["@hourly", "Europe/Berlin"],
    },
  });

  const jobFromApi = await quirrel.getById(job.id);

  expect(jobFromApi?.repeat?.cronTimezone).toEqual("Europe/Berlin");

  server.teardown();
});
