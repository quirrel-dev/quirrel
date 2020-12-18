import { QuirrelClient } from "../src";
import { runQuirrel } from "quirrel";
import * as http from "http";
import delay from "delay";
import Redis from "ioredis";
import { getAddress } from "./ms.test";

test("encryption", async () => {
  const server = await runQuirrel({
    port: 0,
    redisFactory: () => new Redis(process.env.REDIS_URL),
    disableTelemetry: true,
    logger: "none",
  });

  const quirrel = new QuirrelClient({
    baseUrl: getAddress(server.httpServer),
    encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
  });

  const encryptedBodies: string[] = [];
  const decryptedBodies: string[] = [];

  const endpoint = http
    .createServer((req) => {
      let body = "";
      req.on("data", (data) => {
        body += data;
      });
      req.on("end", () => {
        encryptedBodies.push(body);
        const { body: decryptedBody, isValid } = quirrel.verifyRequestSignature(
          req.headers as any,
          body
        );
        decryptedBodies.push(isValid ? decryptedBody : "-invalid");
      });
    })
    .listen(0);

  const endpointAddress = getAddress(endpoint);

  await quirrel.enqueue(endpointAddress, {
    body: "hello world",
  });

  await delay(200);

  expect(encryptedBodies).toHaveLength(1);
  expect(encryptedBodies[0].startsWith("ddb7:")).toBe(true);
  expect(decryptedBodies).toEqual(["hello world"]);

  server.close();
  endpoint.close();
});
