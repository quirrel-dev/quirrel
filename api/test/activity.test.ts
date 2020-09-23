import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import delay from "delay";
import type * as http from "http";
import * as request from "supertest";
import * as websocket from "websocket";
import { AddressInfo } from "ws";

describe("activity", () => {
  let quirrel: http.Server;
  let teardown: () => Promise<void>;

  let server: FastifyInstance;
  let endpoint: string;
  let bodies: any[] = [];
  let lastBody: any = undefined;

  beforeAll(async () => {
    const result = await run();
    quirrel = result.server;
    teardown = result.teardown;

    await result.redis.flushall();

    server = fastify();
    server.post("/", (request, reply) => {
      lastBody = request.body;
      bodies.push(lastBody);
      reply.status(200).send("OK");
    });

    endpoint = encodeURIComponent(await server.listen(0));
  });

  beforeEach(() => {
    bodies = [];
    lastBody = undefined;
  });

  afterAll(async () => {
    await Promise.all([teardown(), server.close()]);
  });

  it("works", async () => {
    const client = new websocket.client();

    const log: any[] = [];

    let conn: websocket.connection | undefined

    client.on("connect", (connection) => {
      conn = connection;

      log.push("connect");

      connection.on("message", (message) => {
        log.push(message.utf8Data);
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

    await request(quirrel)
      .post("/queues/" + endpoint)
      .send({ body: { foo: "bar" } })
      .expect(201);

    await request(quirrel)
      .post("/queues/" + endpoint)
      .send({ body: { foo: "bar" }, delay: 300 })
      .expect(201);

    await delay(500);

    conn?.close()

    await delay(100);

    expect(log).toEqual(["connect", [], "close"]);
  });
});
