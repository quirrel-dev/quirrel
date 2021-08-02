import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./util";
import * as http from "http";
import delay from "delay";

test("cron payload with encryption", async () => {
  const server = await run("Mock");

  const encryptedBodies: string[] = [];
  const decryptedBodies: string[] = [];

  let quirrel: QuirrelClient<any>;

  const endpoint = http
    .createServer((req) => {
      let body = "";
      req.on("data", (data) => {
        body += data;
      });
      req.on("end", () => {
        encryptedBodies.push(body);
        quirrel.respondTo(body, req.headers).then(({ status }) => {
          if (status === 401) {
            decryptedBodies.push("-invalid");
          }
        });
      });
    })
    .listen(0);

  quirrel = new QuirrelClient({
    route: "/",
    async handler(body) {
      decryptedBodies.push(body);
    },
    config: {
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      applicationBaseUrl: getAddress(endpoint),
    },
  });

  await server.app.app.jobs.updateCron("anonymous", {
    baseUrl: getAddress(endpoint),
    crons: [{ route: "/", schedule: "@daily" }],
  });

  await quirrel.invoke("@cron");

  await delay(100);

  expect(encryptedBodies).toEqual(["null"]);
  expect(decryptedBodies).toEqual([null]);
  server.teardown();
});
