import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import * as http from "http";
import delay from "delay";
import { getAddress } from "./ms.test";

test("encryption", async () => {
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
        quirrel
          .respondTo(body, req.headers["x-quirrel-signature"] as string)
          .then(({ status }) => {
            if (status === 401) {
              decryptedBodies.push("-invalid");
            }
          });
      });
    })
    .listen(0);

  quirrel = new QuirrelClient({
    async handler(body) {
      decryptedBodies.push(body);
    },
    route: "/lol",
    config: {
      applicationBaseUrl: getAddress(endpoint),
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
    },
  });

  await quirrel.enqueue("hello world");

  await delay(200);

  expect(encryptedBodies).toHaveLength(1);
  expect(encryptedBodies[0].startsWith("ddb7:")).toBe(true);
  expect(decryptedBodies).toEqual(["hello world"]);

  server.teardown();
  endpoint.close();
});
