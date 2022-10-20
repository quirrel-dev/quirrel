import { run } from "./runQuirrel";
import fastify, { FastifyInstance } from "fastify";
import request from "supertest";
import delay from "delay";
import { getAddress } from "../../client/test/util";

describe("SSRF Prevention", () => {
  let server: FastifyInstance;
  let teardown: () => Promise<void>;

  let lastRequestBody: any = null;

  beforeAll(async () => {
    server = fastify();
    server.post("/database/drop", (request, reply) => {
      lastRequestBody = request.body;
      reply.status(200).send("OK");
    });

    await server.listen({
      port: 0,
    });
  });

  afterAll(async () => {
    await server.close();
    await teardown();
  });

  function testWithSSR(mode: "enabled" | "disabled") {
    test("ssrf prevention " + mode, async () => {
      const res = await run("Mock", {
        enableSSRFPrevention: mode === "enabled",
      });
      const quirrel = res.server;
      teardown = res.teardown;

      await request(quirrel)
        .post(
          "/queues/" +
            encodeURIComponent(getAddress(server.server) + "/database/drop")
        )
        .send({ body: "dropthebase" })
        .expect(201);

      await delay(500);

      if (mode === "enabled") {
        expect(lastRequestBody).toBeNull();
      } else {
        expect(lastRequestBody).toEqual("dropthebase");
      }
    });
  }

  testWithSSR("enabled");
  testWithSSR("disabled");
});
