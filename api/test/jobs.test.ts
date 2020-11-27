import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import delay from "delay";
import type http from "http";
import request from "supertest";
import { Redis } from "ioredis";

function testAgainst(backend: "Redis" | "Mock") {
  describe(backend + " > jobs", () => {
    let quirrel: http.Server;
    let teardown: () => Promise<void>;

    let server: FastifyInstance;
    let redis: Redis;
    let endpoint: string;
    let bodies: any[] = [];
    let lastBody: any = undefined;

    beforeAll(async () => {
      const result = await run(backend);
      quirrel = result.server;
      teardown = result.teardown;
      redis = result.redis;

      await result.redis.flushall();

      const server = fastify();
      server.post("/", (request, reply) => {
        lastBody = request.body;
        bodies.push(lastBody);
        reply.status(200).send("OK");
      });

      endpoint = encodeURIComponent(await server.listen(0));
    });

    beforeEach(async () => {
      bodies = [];
      lastBody = undefined;
      await redis.flushall();
    });

    afterAll(async () => {
      await Promise.all([teardown(), server.close()]);
    });

    test("post a job", async () => {
      await request(quirrel)
        .post("/queues/" + endpoint)
        .send({ body: JSON.stringify({ foo: "bar" }) })
        .expect(201);

      await delay(300);

      expect(lastBody).toEqual('{"foo":"bar"}');
    });

    describe("retrieve delayed jobs", () => {
      test("all", async () => {
        const {
          body: { id: jobId1 },
        } = await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: JSON.stringify({ this: "willBeRetrieved", nr: 1 }),
            runAt: new Date(Date.now() + 300).toISOString(),
          })
          .expect(201);

        const {
          body: { id: jobId2 },
        } = await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: JSON.stringify({ this: "willBeRetrieved", nr: 2 }),
            runAt: new Date(Date.now() + 300).toISOString(),
          })
          .expect(201);

        const {
          body: { cursor, jobs },
        } = await request(quirrel).get(`/queues/${endpoint}`).expect(200);

        expect(cursor).toBe(null);
        const jobsWithoutRunAt = jobs.map(
          ({ runAt, ...restOfJob }: { runAt: string }) => restOfJob
        );

        expect(jobsWithoutRunAt).toHaveLength(2);

        expect(jobsWithoutRunAt).toContainEqual({
          id: jobId1,
          body: JSON.stringify({
            this: "willBeRetrieved",
            nr: 1,
          }),
          exclusive: false,
          endpoint: decodeURIComponent(endpoint),
        });
        expect(jobsWithoutRunAt).toContainEqual({
          id: jobId2,
          body: JSON.stringify({
            this: "willBeRetrieved",
            nr: 2,
          }),
          exclusive: false,
          endpoint: decodeURIComponent(endpoint),
        });

        await request(quirrel)
          .delete(`/queues/${endpoint}/${jobId1}`)
          .expect(204);
        await request(quirrel)
          .delete(`/queues/${endpoint}/${jobId2}`)
          .expect(204);
      });

      test("by id", async () => {
        const runAt = new Date(Date.now() + 300).toISOString();
        const {
          body: { id },
        } = await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: JSON.stringify({ this: "willBeRetrieved" }),
            runAt,
          })
          .expect(201);

        const { body: job } = await request(quirrel)
          .get(`/queues/${endpoint}/${id}`)
          .expect(200);

        const { runAt: jobRunAt, ...restOfJob } = job;

        expect(restOfJob).toEqual({
          id,
          body: JSON.stringify({ this: "willBeRetrieved" }),
          endpoint: decodeURIComponent(endpoint),
          exclusive: false,
        });

        expect(+new Date(jobRunAt)).toBeCloseTo(+new Date(runAt), -3);

        await request(quirrel).delete(`/queues/${endpoint}/${id}`).expect(204);
      });
    });

    test("post a delayed job", async () => {
      await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ lol: "lel" }),
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
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ iWill: "beDeleted" }),
          runAt: new Date(Date.now() + 300).toISOString(),
        })
        .expect(201);

      expect(typeof body.id).toBe("string");

      await request(quirrel)
        .delete(`/queues/${endpoint}/${body.id}`)
        .expect(204);

      await delay(500);

      expect(lastBody).not.toEqual('{"iWill":"beDeleted"}');
    });

    test("idempotent jobs", async () => {
      const id = "sameIdAcrossBothJobs";

      const {
        body: { id: jobId1 },
      } = await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ iAm: "theFirstJob" }),
          runAt: new Date(Date.now() + 300).toISOString(),
          id,
        })
        .expect(201);

      expect(jobId1).toEqual(id);

      const {
        body: { id: jobId2 },
      } = await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ iAm: "theSecondJob" }),
          runAt: new Date(Date.now() + 300).toISOString(),
          id,
        })
        .expect(201);

      expect(jobId2).toEqual(id);

      await delay(400);

      expect(bodies).toEqual(['{"iAm":"theFirstJob"}']);

      const {
        body: { id: jobId3 },
      } = await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ iAm: "theSecondJob" }),
          runAt: new Date(Date.now() + 300).toISOString(),
          id,
        })
        .expect(201);

      expect(jobId3).toEqual(id);

      await delay(500);

      expect(bodies).toEqual([
        '{"iAm":"theFirstJob"}',
        '{"iAm":"theSecondJob"}',
      ]);
    });

    describe("repeated jobs", () => {
      test("work", async () => {
        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: "repeat!",
            repeat: {
              every: 200,
              times: 3,
            },
          })
          .expect(201);

        await delay(700);

        expect(bodies).toEqual(["repeat!", "repeat!", "repeat!"]);
      });

      it("can be stacked", async () => {
        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: "repeat!",
            repeat: {
              every: 200,
              times: 3,
            },
          })
          .expect(201);

        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: "repeat 2!",
            repeat: {
              every: 200,
              times: 4,
            },
          })
          .expect(201);

        await delay(1500);

        expect(bodies.filter((v) => v === "repeat!")).toHaveLength(3);
        expect(bodies.filter((v) => v === "repeat 2!")).toHaveLength(4);
      });

      it("works with idempotency IDs", async () => {
        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: "repeat!",
            repeat: {
              every: 200,
              times: 3,
            },
            id: "sameId",
          })
          .expect(201);

        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: "repeat 2!",
            repeat: {
              every: 200,
              times: 4,
            },
            id: "sameId",
          })
          .expect(201);

        await delay(1500);

        expect(bodies).toEqual(["repeat!", "repeat!", "repeat!"]);
      });

      it("supports deletion", async () => {
        const {
          body: { id: jobId },
        } = await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: "repeat!",
            repeat: {
              every: 500,
              times: 5,
            },
            id: "sameId",
          })
          .expect(201);

        await delay(500);

        const numberOfExecutedJobsBeforeDeletion = bodies.length;

        await request(quirrel)
          .delete(`/queues/${endpoint}/${jobId}`)
          .expect(204);

        await delay(3000);

        const jobsExecutedAfterDeletion =
          bodies.length - numberOfExecutedJobsBeforeDeletion;

        expect(jobsExecutedAfterDeletion).toBeLessThan(3);
      });
    });

    test("repeat.times = 0", async () => {
      await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: "cron",
          repeat: {
            times: 0,
          },
        })
        .expect(201);

      await delay(500);

      expect(bodies).toEqual([]);
    });

    test("regression #27: delay & repeat.every", async () => {
      await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: "delay & repeat.every",
          delay: 100,
          repeat: {
            every: 100,
            times: 2,
          },
        })
        .expect(201);

      await delay(75);

      expect(bodies).toEqual([]);

      await delay(75);

      expect(bodies).toEqual(["delay & repeat.every"]);

      await delay(75);

      expect(bodies).toEqual(["delay & repeat.every", "delay & repeat.every"]);
    });

    describe("cron jobs", () => {
      test("work", async () => {
        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: "cron",
            repeat: {
              times: 2,
              cron: "* * * * * *", // every second
            },
            id: "myCronJob",
          })
          .expect(201);

        await delay(1000);

        expect(bodies).toEqual(["cron"]);

        await delay(1200);

        expect(bodies).toEqual(["cron", "cron"]);

        await delay(1200);

        expect(bodies).toEqual(["cron", "cron"]);
      });
    });
  });
}
testAgainst("Mock");
testAgainst("Redis");
