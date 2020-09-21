import { AxiosInstance } from "axios";
import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import delay from "delay";
import * as findFreePort from "find-free-port";

describe("jobs", () => {
  let client: AxiosInstance;
  let teardown: () => Promise<void>;

  let server: FastifyInstance;
  let endpoint: string;
  let bodies: any[] = [];
  let lastBody: any = undefined;

  beforeAll(async (done) => {
    const res = await run();
    client = res.client;
    teardown = res.teardown;

    const server = fastify();
    server.post("/", (request, reply) => {
      lastBody = request.body;
      bodies.push(lastBody);
      reply.status(200).send("OK");
    });

    const [port] = await findFreePort(3000);
    endpoint = await server.listen(port);

    done();
  });

  beforeEach(() => {
    bodies = [];
    lastBody = undefined;
  });

  afterAll(async () => {
    await Promise.all([teardown(), server.close()]);
  });

  test("post a job", async () => {
    const { status } = await client.post("/jobs", {
      endpoint,
      body: { foo: "bar" },
    });

    expect(status).toBe(200);

    await delay(300);

    expect(lastBody).toEqual('{"foo":"bar"}');
  });

  test("post a delayed job", async () => {
    const { status } = await client.post("/jobs", {
      endpoint,
      body: { lol: "lel" },
      runAt: new Date(Date.now() + 300).toISOString(),
    });

    expect(status).toBe(200);

    await delay(150);

    expect(lastBody).not.toEqual('{"lol":"lel"}');

    await delay(200);

    expect(lastBody).toEqual('{"lol":"lel"}');
  });

  test("delete a job before it's executed", async () => {
    const { data } = await client.post("/jobs", {
      endpoint,
      body: { iWill: "beDeleted" },
      runAt: new Date(Date.now() + 300).toISOString(),
    });

    expect(typeof data.id).toBe("string");

    const { status } = await client.delete(`/jobs/${data.id}`);

    expect(status).toBe(204);

    await delay(500);

    expect(lastBody).not.toEqual('{"iWill":"beDeleted"}');
  });

  test("idempotent jobs", async () => {
    const jobId = "sameIdAcrossBothJobs";
    const { data: resultOfFirstJob } = await client.post("/jobs", {
      endpoint,
      body: { iAm: "theFirstJob" },
      runAt: new Date(Date.now() + 300).toISOString(),
      jobId,
    });

    expect(resultOfFirstJob.jobId).toBe(
      encodeURIComponent(endpoint) + ":" + jobId
    );

    const { data: resultOfSecondJob } = await client.post("/jobs", {
      endpoint,
      body: { iAm: "theSecondJob" },
      runAt: new Date(Date.now() + 300).toISOString(),
      jobId,
    });

    expect(resultOfSecondJob.jobId).toBe(
      encodeURIComponent(endpoint) + ":" + jobId
    );

    await delay(400);

    expect(bodies).toEqual(['{"iAm":"theFirstJob"}']);
  });
});
