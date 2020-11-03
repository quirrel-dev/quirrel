import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import delay from "delay";
import { verify } from "secure-webhooks";
import type http from "http";
import request from "supertest";

const passphrase = "hello";

describe("authenticated jobs", () => {
  let quirrel: http.Server;
  let teardown: () => Promise<void>;

  let server: FastifyInstance;
  let endpoint: string;
  let lastBody: any;
  let lastSignature: any;

  beforeAll(async () => {
    const res = await run([passphrase]);
    quirrel = res.server;
    teardown = res.teardown;

    const server = fastify();
    server.post("/", (request, reply) => {
      lastBody = request.body;
      lastSignature = request.headers["x-quirrel-signature"];
      reply.status(200).send("OK");
    });

    endpoint = encodeURIComponent(await server.listen(0));
  });

  afterAll(async () => {
    await Promise.all([teardown(), server.close()]);
  });

  test("post a job", async () => {
    const { text: token } = await request(quirrel)
      .put("/tokens/testproject")
      .auth("ignored", passphrase)
      .expect(201);

    await request(quirrel)
      .post("/queues/" + endpoint)
      .send({
        body: JSON.stringify({ foo: "bar" }),
      })
      .expect(401);

    await request(quirrel)
      .post("/queues/" + endpoint)
      .auth(token, { type: "bearer" })
      .send({
        body: JSON.stringify({ foo: "bar" }),
      })
      .expect(201);

    await delay(300);

    expect(lastBody).toEqual('{"foo":"bar"}');
    expect(lastSignature).toMatch(/v=(\d+),d=([\da-f]+)/);
    expect(verify(lastBody, token, lastSignature)).toBe(true);

    await request(quirrel)
      .delete("/tokens/non-existant")
      .auth("ignored", passphrase)
      .expect(404);

    await request(quirrel)
      .delete("/tokens/testproject")
      .auth("ignored", passphrase)
      .expect(204);

    await request(quirrel)
      .post("/queues/" + endpoint)
      .auth(token, { type: "bearer" })
      .send({
        body: JSON.stringify({ foo: "bar" }),
      })
      .expect(401);

    await request(quirrel)
      .delete("/usage")
      .auth("ignored", passphrase)
      .expect(200, {
        testproject: 2, // one for the initial call, one for execution
      });

    await request(quirrel)
      .delete("/usage")
      .auth("ignored", passphrase)
      .expect(200, {});
  });
});
