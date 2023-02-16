import { QuirrelClient } from "../index.js";
import { run } from "../../api/test/runQuirrel.js";
import { getAddress } from "./util.js";

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
