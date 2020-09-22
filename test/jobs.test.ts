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
      .expect(201);

    await delay(300);

    expect(lastBody).toEqual('{"foo":"bar"}');
  });

  describe("retrieve delayed jobs", () => {
    test("all", async () => {
      const {
        body: { id: jobId1 },
      } = await request(quirrel)
        .post("/jobs")
        .send({
          endpoint,
          body: { this: "willBeRetrieved", nr: 1 },
          runAt: new Date(Date.now() + 300).toISOString(),
        })
        .expect(201);

      const {
        body: { id: jobId2 },
      } = await request(quirrel)
        .post("/jobs")
        .send({
          endpoint,
          body: { this: "willBeRetrieved", nr: 2 },
          runAt: new Date(Date.now() + 300).toISOString(),
        })
        .expect(201);

      const {
        body: { cursor, jobs },
      } = await request(quirrel)
        .get(`/jobs`)
        .expect(200);

      expect(cursor).toBe(0);
      const jobsWithoutRunAt = jobs.map(
        ({ runAt, ...restOfJob }: { runAt: string }) => restOfJob
      );

      expect(jobsWithoutRunAt).toEqual([
        {
          id: jobId1,
          idempotencyKey: jobId1.split(":")[1],
          endpoint,
          body: {
            nr: 1,
            this: "willBeRetrieved"
          }
        },
        {
          id: jobId2,
          idempotencyKey: jobId2.split(":")[1],
          endpoint,
          body: {
            nr: 2,
            this: "willBeRetrieved"
          }
        }
      ])

      await request(quirrel).delete(`/jobs/${jobId1}`).expect(200);
      await request(quirrel).delete(`/jobs/${jobId2}`).expect(200);
    });

    test("by id", async () => {
      const runAt = new Date(Date.now() + 300).toISOString();
      const {
        body: { id },
      } = await request(quirrel)
        .post("/jobs")
        .send({
          endpoint,
          body: { this: "willBeRetrieved" },
          runAt,
        })
        .expect(201);

      const { body: job } = await request(quirrel)
        .get(`/jobs/${id}`)
        .expect(200);

      const { runAt: jobRunAt, ...restOfJob } = job;

      expect(restOfJob).toEqual({
        id,
        idempotencyKey: id.split(":")[1],
        endpoint,
        body: { this: "willBeRetrieved" },
      });

      expect(+new Date(jobRunAt)).toBeCloseTo(+new Date(runAt), -2);

      await request(quirrel).delete(`/jobs/${id}`).expect(200);
    });
  });

  test("post a delayed job", async () => {
    await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { lol: "lel" },
        runAt: new Date(Date.now() + 300).toISOString(),
      })
      .expect(201);

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
      .expect(201);

    expect(typeof body.id).toBe("string");

    await request(quirrel).delete(`/jobs/${body.id}`).expect(200);

    await delay(500);

    expect(lastBody).not.toEqual('{"iWill":"beDeleted"}');
  });

  test("idempotent jobs", async () => {
    const jobId = "sameIdAcrossBothJobs";

    const {
      body: { id: jobId1 },
    } = await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { iAm: "theFirstJob" },
        runAt: new Date(Date.now() + 300).toISOString(),
        jobId,
      })
      .expect(201);

    expect(jobId1).toEqual(encodeURIComponent(endpoint) + ":" + jobId);

    const {
      body: { id: jobId2 },
    } = await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { iAm: "theSecondJob" },
        runAt: new Date(Date.now() + 300).toISOString(),
        jobId,
      })
      .expect(201);

    expect(jobId2).toEqual(encodeURIComponent(endpoint) + ":" + jobId);

    await delay(400);

    expect(bodies).toEqual(['{"iAm":"theFirstJob"}']);

    const {
      body: { id: jobId3 },
    } = await request(quirrel)
      .post("/jobs")
      .send({
        endpoint,
        body: { iAm: "theSecondJob" },
        runAt: new Date(Date.now() + 300).toISOString(),
        jobId,
      })
      .expect(201);

    expect(jobId3).toEqual(encodeURIComponent(endpoint) + ":" + jobId);

    await delay(400);

    expect(bodies).toEqual(['{"iAm":"theFirstJob"}', '{"iAm":"theSecondJob"}']);
  });
});
