import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import * as http from "http";
import { expectToBeInRange, getAddress, makeSignal, stopTime } from "./util";

test("ms", async () => {
  const server = await run("Mock");

  const jobExecuted = makeSignal();

  const endpoint = http
    .createServer((req) => {
      req.on("data", () => {});
      req.on("end", () => {
        jobExecuted.signal();
      });
    })
    .listen(0);

  const quirrel = new QuirrelClient({
    async handler() {},
    route: "",
    config: {
      quirrelBaseUrl: getAddress(server.server),
      applicationBaseUrl: getAddress(endpoint),
    },
  });

  const duration = await stopTime(async () => {
    await quirrel.enqueue("hello world", {
      delay: "50ms",
    });

    await jobExecuted();
  });

  expectToBeInRange(duration, [50, 85]);

  server.teardown();
  endpoint.close();
});
