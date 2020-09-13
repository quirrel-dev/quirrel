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
  let lastBody: any;

  beforeAll(async (done) => {
    const res = await run();
    client = res.client;
    teardown = res.teardown;
    
    const server = fastify();
    server.post("/", (request, reply) => {
      lastBody = request.body;
      reply.status(200).send("OK");
    });

    const [ port ] = await findFreePort(3000);
    endpoint = await server.listen(port);

    done()
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
      runAt: new Date(Date.now() + 300).toISOString()
    });

    expect(status).toBe(200);

    await delay(150);

    expect(lastBody).not.toEqual('{"lol":"lel"}');

    await delay(200);

    expect(lastBody).toEqual('{"lol":"lel"}');
  });
});
