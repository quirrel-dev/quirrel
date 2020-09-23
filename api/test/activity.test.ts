import { run } from "./runQuirrel";
import fastify from "fastify";
import delay from "delay";
import * as request from "supertest";
import * as websocket from "websocket";
import { AddressInfo } from "ws";

jest.setTimeout(20 * 1000);

test("activity", async () => {
  const { server: quirrel, teardown: teardownQuirrel, redis } = await run();

  await redis.flushall();

  let lastBody: any;
  let bodies: any[] = [];

  const server = fastify();
  server.post("/", (request, reply) => {
    lastBody = request.body;
    bodies.push(lastBody);
    reply.status(200).send("OK");
  });

  const endpoint = encodeURIComponent(await server.listen(0));
  const client = new websocket.client();

  const log: any[] = [];

  let conn: websocket.connection | undefined;

  client.on("connect", (connection) => {
    conn = connection;

    log.push("connect");

    connection.on("message", (message) => {
      log.push(JSON.parse(message.utf8Data!));
    });

    connection.on("close", () => {
      log.push("close");
    });
  });

  client.on("connectFailed", (error) => {
    expect(error).toBeNull();
  });

  const { address, port } = quirrel.address() as AddressInfo;

  client.connect(`ws://${address}:${port}/activity`);

  const {
    body: { id: job1id },
  } = await request(quirrel)
    .post("/queues/" + endpoint)
    .send({ body: { foo: "bar" } })
    .expect(201);

  const {
    body: { id: job2id },
  } = await request(quirrel)
    .post("/queues/" + endpoint)
    .send({ body: { qux: "baz" }, delay: 300 })
    .expect(201);

  await delay(500);

  conn?.close();

  await delay(500);

  expect(log).toContainEqual([
    "completed",
    {
      endpoint: decodeURIComponent(endpoint),
      id: job1id,
    },
  ]);
  expect(log).toContainEqual([
    "waiting",
    {
      endpoint: decodeURIComponent(endpoint),
      id: job2id,
    },
  ]);
  expect(log).toContainEqual([
    "delayed",
    {
      endpoint: decodeURIComponent(endpoint),
      id: job2id,
    },
  ]);
  expect(log).toContainEqual([
    "completed",
    {
      endpoint: decodeURIComponent(endpoint),
      id: job2id,
    },
  ]);

  expect(log).toContainEqual("connect");
  expect(log).toContainEqual("close");

  await teardownQuirrel();
  await server.close();
});
