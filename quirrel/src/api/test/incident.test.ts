import { run } from "./runQuirrel";
import fastify from "fastify";
import delay from "delay";
import request from "supertest";

function testAgainst(backend: "Redis" | "Mock") {
  async function setup({ fail }: { fail: boolean }) {
    const server = fastify();
    server.post("/", () => {
      throw new Error("Something broke!");
    });

    const endpoint = encodeURIComponent(await server.listen(0));

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
      (await incidentReceiver.listen(0)) + "/incident";

    const res = await run(backend, [], {
      endpoint: incidentReceiverEndpoint,
      passphrase: "super-secret",
    });

    const quirrel = res.server;
    const teardown = res.teardown;

    return {
      quirrel,
      endpoint,
      incidentReceiverBodies,
      incidentReceiverAuthorizations,
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

      await delay(50);

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
