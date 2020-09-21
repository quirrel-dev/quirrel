import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import delay from "delay";
import type * as http from "http";
import * as request from "supertest";

describe("jobs", () => {
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

    const server = fastify();
    server.post("/", (request, reply) => {
      lastBody = request.body;
      bodies.push(lastBody);
      reply.status(200).send("OK");
    });

    endpoint = await server.listen(0);

    
  });

  beforeEach(() => {
    bodies = [];
    lastBody = undefined;
  });

  afterAll(async () => {
    await Promise.all([teardown(), server.close()]);
  });

  test("post a job", async () => {
    await request(quirrel)
      .post("/jobs")
      .send({ endpoint, body: { foo: "bar" } })
      .expect(200);

    await delay(300);

    expect(lastBody).toEqual('{"foo":"bar"}');
  });

  test("post a delayed job", async () => {
    await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { lol: "lel" },
        runAt: new Date(Date.now() + 300).toISOString(),
      })
      .expect(200);

    await delay(150);

    expect(lastBody).not.toEqual('{"lol":"lel"}');

    await delay(300);

    expect(lastBody).toEqual('{"lol":"lel"}');
  });

  test("delete a job before it's executed", async () => {
    const { body } = await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { iWill: "beDeleted" },
        runAt: new Date(Date.now() + 300).toISOString(),
      })
      .expect(200);

    expect(typeof body.jobId).toBe("string");

    await request(quirrel).delete(`/jobs/${body.jobId}`).expect(204);

    await delay(500);

    expect(lastBody).not.toEqual('{"iWill":"beDeleted"}');
  });

  test("idempotent jobs", async () => {
    const jobId = "sameIdAcrossBothJobs";

    await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { iAm: "theFirstJob" },
        runAt: new Date(Date.now() + 300).toISOString(),
        jobId,
      })
      .expect(200, { jobId });

    await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { iAm: "theSecondJob" },
        runAt: new Date(Date.now() + 300).toISOString(),
        jobId,
      })
      .expect(200, { jobId });

    await delay(400);

    expect(bodies).toEqual(['{"iAm":"theFirstJob"}']);
  });
});
