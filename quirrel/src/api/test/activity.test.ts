import { run } from "./runQuirrel";
import fastify from "fastify";
import delay from "delay";
import request from "supertest";
import websocket from "websocket";
import type { AddressInfo } from "net";

jest.setTimeout(20 * 1000);

function testAgainst(backend: "Redis" | "Mock") {
  test(backend + " > activity", async () => {
    const now = Date.now();

    const { server: quirrel, teardown: teardownQuirrel, redis } = await run(
      backend
    );

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

    await new Promise<void>((resolve) => {
      client.on("connect", (connection) => {
        conn = connection;

        log.push("connect");

        connection.on("message", (message) => {
          log.push(JSON.parse(message.utf8Data!));
        });

        connection.on("close", () => {
          log.push("close");
        });

        resolve();
      });

      client.on("connectFailed", (error) => {
        expect(error).toBeNull();
      });

      const { address, port } = quirrel.address() as AddressInfo;

      client.connect(`ws://${address}:${port}/activity`);
    });

    const {
      body: { id: job1id },
    } = await request(quirrel)
      .post("/queues/" + endpoint)
      .send({ body: JSON.stringify({ foo: "bar" }) })
      .expect(201);

    const {
      body: { id: job2id },
    } = await request(quirrel)
      .post("/queues/" + endpoint)
      .send({
        body: JSON.stringify({ qux: "baz" }),
        runAt: new Date(now + 300).toISOString(),
      })
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
      "started",
      {
        endpoint: decodeURIComponent(endpoint),
        id: job2id,
      },
    ]);
    expect(log).toContainEqual([
      "scheduled",
      {
        body: JSON.stringify({ qux: "baz" }),
        endpoint: decodeURIComponent(endpoint),
        id: job2id,
        retry: [],
        count: 1,
        runAt: new Date(now + 300).toISOString(),
        exclusive: false,
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
}

testAgainst("Mock");
testAgainst("Redis");
