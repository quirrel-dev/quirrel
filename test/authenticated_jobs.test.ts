import { AxiosInstance } from "axios";
import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import delay from "delay";
import * as findFreePort from "find-free-port";

const passphrase = "hello";

describe("authenticated jobs", () => {
  let client: AxiosInstance;
  let teardown: () => Promise<void>;

  let server: FastifyInstance;
  let endpoint: string;
  let lastBody: any;

  beforeAll(async (done) => {
    const res = await run([passphrase]);
    client = res.client;
    teardown = res.teardown;

    const server = fastify();
    server.post("/", (request, reply) => {
      lastBody = request.body;
      reply.status(200).send("OK");
    });

    const [port] = await findFreePort(3000);
    endpoint = await server.listen(port);

    done();
  });

  afterAll(async () => {
    await Promise.all([teardown(), server.close()]);
  });

  test("post a job", async () => {
    const { data: token } = await client.post(
      "/tokens",
      { id: "testproject" },
      { auth: { username: "ignored", password: passphrase } }
    );

    const { status: statusWithoutAuth } = await client.post(
      "/jobs",
      {
        endpoint,
        body: { foo: "bar" },
      },
      {
        validateStatus: () => true
      }
    );

    expect(statusWithoutAuth).toBe(401);

    const { status } = await client.post(
      "/jobs",
      {
        endpoint,
        body: { foo: "bar" },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(status).toBe(200);

    await delay(300);

    expect(lastBody).toEqual({ foo: "bar" });
  });

});
