import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import delay from "delay";
import type http from "http";
import request from "supertest";
import { Redis } from "ioredis";
import {
  describeAcrossBackends,
  expectToBeInRange,
  makeSignal,
  stopTime,
} from "../../client/test/util";

describeAcrossBackends("Jobs", (backend) => {
  let quirrel: http.Server;
  let teardown: () => Promise<void>;

  let server: FastifyInstance;
  let redis: Redis;
  let endpoint: string;
  let bodies: any[] = [];
  let lastBody: any = undefined;

  let bodies$ = makeSignal();

  beforeAll(async () => {
    const result = await run(backend);
    quirrel = result.server;
    teardown = result.teardown;
    redis = result.redis;

    await result.redis.flushall();

    server = fastify();
    server.post("/", (request, reply) => {
      lastBody = request.body;
      bodies.push(lastBody);
      bodies$.signal(lastBody);
      reply.status(200).send("OK");
    });

    endpoint = encodeURIComponent(
      await server.listen({
        port: 0,
      })
    );
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

  test("stats", async () => {
    await request(quirrel)
      .post("/queues/" + endpoint)
      .send({ body: JSON.stringify({ foo: "bar" }), delay: 1000 })
      .expect(201);

    await delay(300);

    await request(quirrel)
      .get("/queues/stats")
      .expect(200, { [decodeURIComponent(endpoint)]: { count: 1 } });
  });

  test("post multiple jobs", async () => {
    const response = await request(quirrel)
      .post("/queues/" + endpoint + "/batch")
      .send([
        { body: JSON.stringify({ first: "job" }) },
        { body: JSON.stringify({ second: "job" }) },
      ])
      .expect(201);

    expect(response.body[0].body).toBe(JSON.stringify({ first: "job" }));
    expect(response.body[1].body).toBe(JSON.stringify({ second: "job" }));
  });

  describe("enqueueing a job in the past", () => {
    it("should execute immediately", async () => {
      await request(quirrel)
        .post("/queues/" + endpoint)
        .send({ body: JSON.stringify({ inThe: "past" }), runAt: new Date(0) })
        .expect(201);

      await delay(300);

      expect(lastBody).toEqual('{"inThe":"past"}');
    });
  });

  test("enqueueing a job with delay < 0", async () => {
    await request(quirrel)
      .post("/queues/" + endpoint)
      .send({ body: JSON.stringify({ foo: "bar" }), delay: -1 })
      .expect(
        400,
        '{"statusCode":400,"error":"Bad Request","message":"body/delay must be >= 0"}'
      );
  });

  test("enqueueing a job with an invalid cron regex", async () => {
    await request(quirrel)
      .post("/queues/" + endpoint)
      .send({
        body: JSON.stringify({ foo: "bar" }),
        repeat: { cron: "invalid" },
      })
      .expect(
        400,
        '{"statusCode":400,"error":"Bad Request","message":"body.repeat.cron uses unsupported syntax. See https://github.com/harrisiirak/cron-parser for reference."}'
      );
  });

  test("enqueueing a job with an invalid timezone", async () => {
    await request(quirrel)
      .post("/queues/" + endpoint)
      .send({
        body: JSON.stringify({ foo: "bar" }),
        repeat: { cron: "* * * * *", cronTimezone: "Europe/NonExistant" },
      })
      .expect(
        400,
        '{"statusCode":400,"error":"Bad Request","message":"body.repeat.cronTimezone is invalid, please provide a valid IANA timezone."}'
      );
  });

  describe("enqueueing a job with delay > 32 bit", () => {
    it("does not print TimeoutOverflowWarning", async () => {
      await request(quirrel)
        .post("/queues/" + endpoint)
        .send({ body: JSON.stringify({ foo: "bar" }), delay: 3147483647 })
        .expect(201);
    });
  });

  describe("enqueueing a job with an endpoint > 86 characters (repro #514)", () => {
    it("works", async () => {
      const endpoint = encodeURIComponent(
        "https://some-very-long-subdomain.example.org/very/long/queue/endpoint/url/with/a/lot/of/characters"
      );
      const job = await request(quirrel)
        .post("/queues/" + endpoint)
        .send({ body: JSON.stringify({ foo: "bar" }), delay: 1000 })
        .expect(201);

      await request(quirrel)
        .delete("/queues/" + endpoint + "/" + job.body.id)
        .expect(204);
    });
  });

  test("queue list", async () => {
    async function sendTo(endpoint: string) {
      await request(quirrel)
        .post("/queues/" + encodeURIComponent(endpoint))
        .send({ body: JSON.stringify({ foo: "bar" }) })
        .expect(201);
    }

    await sendTo("http://my-url.com/1");
    await sendTo("http://my-url.com/2");
    await sendTo("http://my-url.com/3");

    const { body } = await request(quirrel)
      .get("/queues/")
      .send({ body: JSON.stringify({ foo: "bar" }) })
      .expect(200);

    expect(body.sort()).toEqual(
      [
        "http://my-url.com/1",
        "http://my-url.com/2",
        "http://my-url.com/3",
      ].sort()
    );
  });

  test("queue list migration", async () => {
    async function sendTo(endpoint: string) {
      await request(quirrel)
        .post("/queues/" + encodeURIComponent(endpoint))
        .send({ body: JSON.stringify({ foo: "bar" }), delay: 100 })
        .expect(201);
    }

    await sendTo("http://my-url.com/1");
    await sendTo("http://my-url.com/2");
    await sendTo("http://my-url.com/3");

    await redis.del("queues:by-token:anonymous");
    await redis.del("queues-migrated");

    const { body } = await request(quirrel)
      .get("/queues/")
      .send({ body: JSON.stringify({ foo: "bar" }) })
      .expect(200);

    expect(body.sort()).toEqual(
      [
        "http://my-url.com/1",
        "http://my-url.com/2",
        "http://my-url.com/3",
      ].sort()
    );
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
        retry: [],
        count: 1,
        endpoint: decodeURIComponent(endpoint),
      });
      expect(jobsWithoutRunAt).toContainEqual({
        id: jobId2,
        body: JSON.stringify({
          this: "willBeRetrieved",
          nr: 2,
        }),
        exclusive: false,
        retry: [],
        count: 1,
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
        retry: [],
        count: 1,
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

    await request(quirrel).delete(`/queues/${endpoint}/${body.id}`).expect(204);

    await delay(500);

    expect(lastBody).not.toEqual('{"iWill":"beDeleted"}');
  });

  test("delete all jobs on a queue", async () => {
    await request(quirrel)
      .post("/queues/" + endpoint + "/batch")
      .send([
        {
          body: JSON.stringify({ iWill: "beDeleted_1" }),
          runAt: new Date(Date.now() + 300).toISOString(),
        },
        {
          body: JSON.stringify({ iWill: "beDeleted_2" }),
          runAt: new Date(Date.now() + 300).toISOString(),
        },
      ])
      .expect(201);

    await request(quirrel).delete(`/queues/${endpoint}`).expect(204);

    await request(quirrel)
      .get(`/queues/${endpoint}`)
      .expect(200, { jobs: [], cursor: null });
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

    expect(bodies).toEqual(['{"iAm":"theFirstJob"}', '{"iAm":"theSecondJob"}']);
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

      await request(quirrel).delete(`/queues/${endpoint}/${jobId}`).expect(204);

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
      .expect(400, {
        statusCode: 400,
        error: "Bad Request",
        message: "body/repeat/times must be >= 1",
      });

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

  test("regression: non-absolute URLs shouldn't be accepted", async () => {
    await request(quirrel)
      .post(
        "/queues/" + encodeURIComponent("https://${SOME_ENV_VAR}/api/someQueue")
      )
      .send({
        body: "something",
      })
      .expect(400, {
        statusCode: 400,
        error: "Bad Request",
        message: 'params/endpoint must match format "uri"',
      });
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

      const firstExecutionTime = await stopTime(() => bodies$("cron"));
      expectToBeInRange(firstExecutionTime, [0, 1200]);

      expect(bodies).toEqual(["cron"]);

      const secondExecutionTime = await stopTime(() => bodies$("cron"));
      expectToBeInRange(secondExecutionTime, [0, 1200]);

      await delay(1200);

      expect(bodies).toEqual(["cron", "cron"]);
    });

    describe("when updating", () => {
      async function registerCron(
        schedule: "0 5 * * *" | "0 6 * * *",
        timezone: "Etc/UTC" | "Asia/Taipei" // Taoipei doesn't observe daylight savings
      ) {
        return await request(quirrel)
          .put("/queues/update-cron")
          .send({
            baseUrl: decodeURIComponent(endpoint),
            crons: [
              {
                route: "/",
                schedule,
                timezone,
              },
            ],
          });
      }

      async function getRunAt() {
        const job = await request(quirrel).get(
          `/queues/${endpoint + encodeURIComponent("/")}/@cron`
        );
        expect(job.status).toBe(200);
        return new Date(job.body.runAt);
      }

      test("they're rescheduled", async () => {
        const timezone = "Etc/UTC";
        const resp = await registerCron("0 5 * * *", timezone);
        expect(resp.body).toEqual({ deleted: [] });

        const runAtJob1 = await getRunAt();

        const resp2 = await registerCron("0 6 * * *", timezone);
        expect(resp2.body).toEqual({ deleted: [] });

        const runAtJob2 = await getRunAt();

        const oneHour = 60 * 60 * 1000;
        expect(+runAtJob2 - +runAtJob1).toBeCloseTo(oneHour);
      });

      describe("timezones", () => {
        test("they're rescheduled", async () => {
          const schedule = "0 5 * * *";
          const resp = await registerCron(schedule, "Etc/UTC");
          expect(resp.body).toEqual({ deleted: [] });

          const runAtJob1 = await getRunAt();

          const resp2 = await registerCron(schedule, "Asia/Taipei");
          expect(resp2.body).toEqual({ deleted: [] });

          const runAtJob2 = await getRunAt();

          const eightHours = 8 * 60 * 60 * 1000;
          // expect(+runAtJob1 - +runAtJob2).toBeCloseTo(eightHours);
          expect(runAtJob1).not.toEqual(runAtJob2);
        });
      });
    });
  });
});
