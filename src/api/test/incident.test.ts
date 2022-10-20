import { run } from "./runQuirrel";
import fastify from "fastify";
import delay from "delay";
import request from "supertest";

function testAgainst(backend: "Redis" | "Mock") {
  async function setup({ fail = false }: { fail?: boolean } = {}) {
    const server = fastify();
    const executionIds: string[] = [];
    server.post("/", (request, reply) => {
      executionIds.push(request.id);
      const { status } = JSON.parse(request.body as string);
      if (status) {
        reply.status(status).send();
        return;
      }

      throw new Error("Something broke!");
    });

    const endpoint = encodeURIComponent(
      await server.listen({
        port: 0,
      })
    );

    const incidentReceiverAuthorizations: any[] = [];
    const incidentReceiverBodies: any[] = [];

    const incidentReceiver = fastify();
    incidentReceiver.post("/incident", (request, reply) => {
      if (fail) {
        reply.status(500).send();
      } else {
        incidentReceiverBodies.push(request.body);
        incidentReceiverAuthorizations.push(request.headers.authorization);

        reply.status(200).send();
      }
    });

    const incidentReceiverEndpoint =
      (await incidentReceiver.listen({
        port: 0,
      })) + "/incident";

    const res = await run(backend, {
      incidentReceiver: {
        endpoint: incidentReceiverEndpoint,
        passphrase: "super-secret",
      },
    });

    const quirrel = res.server;
    const teardown = res.teardown;

    return {
      quirrel,
      endpoint,
      incidentReceiverBodies,
      incidentReceiverAuthorizations,
      executionIds,
      teardown: () =>
        Promise.all([teardown(), server.close(), incidentReceiver.close()]),
    };
  }

  describe(backend + " > incidents", () => {
    test("are sent to the incident receiver", async () => {
      const {
        teardown,
        quirrel,
        endpoint,
        incidentReceiverAuthorizations,
        incidentReceiverBodies,
      } = await setup({
        fail: false,
      });

      const runAt = new Date().toISOString();

      await request(quirrel)
        .post("/queues/" + endpoint)
        .send({
          body: JSON.stringify({ foo: "bar" }),
          id: "a",
          runAt,
        })
        .expect(201);

      await delay(100);

      expect(incidentReceiverBodies).toEqual([
        {
          type: "incident",
          incident: {
            body: JSON.stringify({
              statusCode: 500,
              error: "Internal Server Error",
              message: "Something broke!",
            }),
            status: 500,
          },
          job: {
            endpoint: decodeURIComponent(endpoint),
            id: "a",
            payload: JSON.stringify({ foo: "bar" }),
            runAt,
            tokenId: "anonymous",
          },
        },
      ]);
      expect(incidentReceiverAuthorizations).toEqual(["Bearer super-secret"]);

      await teardown();
    });

    describe("on a repeated job", () => {
      describe("when seeing a 404", () => {
        it("ends that job", async () => {
          const {
            teardown,
            quirrel,
            endpoint,
            incidentReceiverBodies,
          } = await setup();

          const runAt = new Date().toISOString();

          await request(quirrel)
            .post("/queues/" + endpoint)
            .send({
              body: JSON.stringify({ status: 404 }),
              id: "a",
              runAt,
              repeat: {
                every: 1 * 1000,
                times: 3,
              },
            })
            .expect(201);

          await delay(100);

          expect(incidentReceiverBodies).toHaveLength(1);

          await request(quirrel).get(`/queues/${endpoint}/a`).expect(404);

          await teardown();
        });
      });

      describe("when seeing non-404", () => {
        it("schedules next execution", async () => {
          const {
            teardown,
            quirrel,
            endpoint,
            incidentReceiverBodies,
          } = await setup();

          const runAt = new Date().toISOString();

          await request(quirrel)
            .post("/queues/" + endpoint)
            .send({
              body: JSON.stringify({ status: 502 }),
              id: "a",
              runAt,
              repeat: {
                every: 50,
                times: 3,
              },
            })
            .expect(201);

          await delay(200);

          expect(incidentReceiverBodies).toHaveLength(3);

          await teardown();
        });
      });
    });

    describe("with retry", () => {
      it("retries", async () => {
        const {
          teardown,
          quirrel,
          endpoint,
          incidentReceiverBodies,
          executionIds,
        } = await setup();

        const runAt = new Date().toISOString();

        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: JSON.stringify({ status: 502 }),
            id: "a",
            runAt,
            retry: [100, 200],
          })
          .expect(201);

        await delay(500);

        expect(executionIds).toHaveLength(3);
        expect(incidentReceiverBodies).toHaveLength(1);

        await teardown();
      });
    });

    describe("when the incident receiver is down", () => {
      it("just continues normally", async () => {
        const {
          teardown,
          quirrel,
          endpoint,
          incidentReceiverAuthorizations,
          incidentReceiverBodies,
        } = await setup({
          fail: true,
        });

        const runAt = new Date().toISOString();

        await request(quirrel)
          .post("/queues/" + endpoint)
          .send({
            body: JSON.stringify({ foo: "bar" }),
            id: "a",
            runAt,
          })
          .expect(201);

        await delay(50);

        expect(incidentReceiverBodies).toEqual([]);
        expect(incidentReceiverAuthorizations).toEqual([]);

        await teardown();
      });
    });
  });
}

testAgainst("Redis");
testAgainst("Mock");
