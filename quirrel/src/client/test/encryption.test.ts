import { JobMeta, QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import * as http from "http";
import delay from "delay";
import { getAddress } from "./ms.test";

test("encryption", async () => {
  const server = await run("Mock");

  const encryptedBodies: string[] = [];
  const decryptedBodies: string[] = [];
  const jobMetadata: JobMeta[] = [];

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
    async handler(body, meta) {
      jobMetadata.push(meta);
      decryptedBodies.push(body);
    },
    route: "/lol",
    config: {
      applicationBaseUrl: getAddress(endpoint),
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
    },
  });

  const job = await quirrel.enqueue("hello world");

  const jobAgainButFetched = await quirrel.getById(job.id);
  expect(jobAgainButFetched).not.toBeNull();

  const nonExistantJob = await quirrel.getById("non-existant");
  expect(nonExistantJob).toBeNull();

  await delay(200);

  expect(encryptedBodies).toHaveLength(1);
  expect(encryptedBodies[0].startsWith("ddb7:")).toBe(true);
  expect(decryptedBodies).toEqual(["hello world"]);
  expect(jobMetadata).toEqual([
    {
      id: job.id,
    },
  ]);

  server.teardown();
  endpoint.close();
});

test("catchDecryptionErrors", async () => {
  const decryptionErrors: Error[] = [];
  const quirrel = new QuirrelClient({
    async handler() {},
    route: "/",
    config: {
      applicationBaseUrl: "hello",
      quirrelBaseUrl: "lelel",
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
    },
    catchDecryptionErrors(error) {
      decryptionErrors.push(error);
    },
  });

  const result = await (quirrel as any).decryptAndDecodeBody(
    "This is non-decryptable"
  );
  expect(result).toEqual("This is non-decryptable");

  expect(decryptionErrors.length).toBe(1);
  expect(decryptionErrors[0].message).toBe(
    "Cannot read property 'length' of undefined"
  );
});
