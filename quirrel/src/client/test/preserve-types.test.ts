import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import * as http from "http";
import delay from "delay";
import { getAddress } from "./ms.test";

it("preserves payload types", async () => {
  const server = await run("Mock");

  const decryptedBodies: Date[] = [];

  let quirrel: QuirrelClient<Date>;

  const endpoint = http
    .createServer((req) => {
      let body = "";
      req.on("data", (data) => {
        body += data;
      });
      req.on("end", () => {
        quirrel.respondTo(body, req.headers);
      });
    })
    .listen(0);

  quirrel = new QuirrelClient({
    async handler(payload) {
      decryptedBodies.push(payload);
    },
    route: "/lol",
    config: {
      applicationBaseUrl: getAddress(endpoint),
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
    },
  });

  const input = new Date("2021-03-08T08:31:00.843Z");

  await quirrel.enqueue(input);

  await delay(200);

  expect(decryptedBodies).toEqual([input]);
  server.teardown();
  endpoint.close();
});
