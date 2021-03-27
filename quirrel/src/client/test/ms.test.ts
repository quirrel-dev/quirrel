import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import type { AddressInfo } from "net";
import * as http from "http";
import { expectToBeInRange, makeSignal, stopTime } from "./util";

export function getAddress(server: http.Server): string {
  let { address, port } = server.address() as AddressInfo;

  if (address === "::") {
    address = "localhost";
  }

  return `http://${address}:${port}`;
}

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

  expectToBeInRange(duration, [50, 75]);

  server.teardown();
  endpoint.close();
});
