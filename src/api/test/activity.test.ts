import { run } from "./runQuirrel";
import fastify from "fastify";
import request from "supertest";
import websocket from "websocket";
import {
  describeAcrossBackends,
  expectToBeInRange,
  expectToHaveEqualMembers,
  getAddress,
  makeSignal,
  stopTime,
  waitUntil,
} from "../../client/test/util";

jest.setTimeout(20 * 1000);

describeAcrossBackends("Activity", (backend) => {
  it("works", async () => {
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

    const endpoint = encodeURIComponent(await server.listen({
      port: 0
    }));
    const client = new websocket.client();

    const log: any[] = [];

    let conn: websocket.connection | undefined;

    const closed$ = makeSignal();

    await new Promise<void>((resolve) => {
      client.on("connect", (connection) => {
        conn = connection;

        log.push("connect");

        connection.on("message", (message) => {
          log.push(
            JSON.parse(
              message.type === "utf8"
                ? message.utf8Data
                : message.binaryData.toString()
            )
          );
        });

        connection.on("close", () => {
          log.push("close");
          closed$.signal();
        });

        setTimeout(resolve, 10);
      });

      client.on("connectFailed", (error) => {
        expect(error).toBeNull();
      });

      client.connect(
        getAddress(quirrel).replace("http://", "ws://") + "/activity"
      );
    });

    let id1 = "";
    let id2 = "";

    const now = Date.now();
    const time = await stopTime(async () => {
      const {
        body: { id: job1id },
      } = await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ foo: "bar" }),
          runAt: new Date(now).toISOString(),
        })
        .expect(201);

      id1 = job1id;

      const {
        body: { id: job2id },
      } = await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ qux: "baz" }),
          runAt: new Date(now + 300).toISOString(),
        })
        .expect(201);
      id2 = job2id;

      await waitUntil(
        () => log.filter((entry) => entry[0] === "completed").length === 2,
        500
      );
    });

    expectToBeInRange(time, [300, 400]);

    conn?.close();

    await closed$();

    expectToHaveEqualMembers(log, [
      "connect",
      [
        "scheduled",
        {
          body: JSON.stringify({ foo: "bar" }),
          endpoint: decodeURIComponent(endpoint),
          id: id1,
          retry: [],
          count: 1,
          runAt: new Date(now).toISOString(),
          exclusive: false,
        },
      ],
      [
        "scheduled",
        {
          body: JSON.stringify({ qux: "baz" }),
          endpoint: decodeURIComponent(endpoint),
          id: id2,
          retry: [],
          count: 1,
          runAt: new Date(now + 300).toISOString(),
          exclusive: false,
        },
      ],
      [
        "started",
        {
          endpoint: decodeURIComponent(endpoint),
          id: id1,
        },
      ],
      [
        "started",
        {
          endpoint: decodeURIComponent(endpoint),
          id: id2,
        },
      ],
      [
        "completed",
        {
          endpoint: decodeURIComponent(endpoint),
          id: id1,
        },
      ],
      [
        "completed",
        {
          endpoint: decodeURIComponent(endpoint),
          id: id2,
        },
      ],
      "close",
    ]);

    await teardownQuirrel();
    await server.close();
  });
});
