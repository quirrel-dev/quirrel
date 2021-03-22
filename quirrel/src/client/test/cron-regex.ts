import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./ms.test";

test("cron regex", async () => {
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

  await quirrel.enqueue(null, {
    repeat: {
      cron: "* * * L * *",
    },
  });

  server.teardown();
});
