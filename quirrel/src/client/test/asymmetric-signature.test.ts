import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import * as http from "http";
import { getAddress, waitUntil } from "./util";
import { generateKeyPairSync } from "crypto";

function getKeyPair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
}

test("asymmetric signature", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const { publicKey, privateKey } = getKeyPair();

  const server = await run("Mock", {
    webhookSigningPrivateKey: privateKey,
  });

  let quirrel: QuirrelClient<any>;

  const responses: any[] = [];

  const endpoint = http
    .createServer((req, res) => {
      let body = "";
      req.on("data", (data) => {
        body += data;
      });
      req.on("end", async () => {
        const result = await quirrel.respondTo(body, req.headers);
        responses.push(result);
      });
    })
    .listen(0);

  quirrel = new QuirrelClient({
    async handler() {},
    route: "/lol",
    config: {
      applicationBaseUrl: getAddress(endpoint),
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      signaturePublicKey: publicKey,
    },
  });

  await quirrel.enqueue("hello world");
  await waitUntil(() => responses.length === 1, 100);
  expect(responses[0]).toEqual({
    body: "OK",
    headers: {},
    status: 200,
  });

  (quirrel as any).signaturePublicKey = getKeyPair().publicKey;

  await quirrel.enqueue("hello world");
  await waitUntil(() => responses.length === 2, 100);
  expect(responses[1].body).toEqual("Signature invalid");

  server.teardown();
  endpoint.close();

  process.env.NODE_ENV = oldNodeEnv;
});
