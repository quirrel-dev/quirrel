import delay from "delay";
import { fastify } from "fastify";
import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./util";

test("cronjob without QuirrelClient", async () => {
  let lastIncident: any = null;
  const incidentReceiver = fastify();
  incidentReceiver.post("/", async (req, reply) => {
    lastIncident = req.body;
    reply.code(200).send();
  });
  const incidentEndpoint = await incidentReceiver.listen({
    port: 0,
  });

  let callCount = 0;
  let lastWasError = false;

  // a bog standard application server,
  // doesn't know about Quirrel protocol
  const applicationServer = fastify();
  applicationServer.post("/", async (req, reply) => {
    callCount++;

    if (callCount === 3) {
      lastWasError = true;
      reply.code(500).send("oops, accidentally exploded");
      return;
    }

    lastWasError = false;
    reply.code(200).send();
    return;
  });
  const endpoint = await applicationServer.listen({
    port: 0,
  });

  const quirrelServer = await run("Mock", {
    incidentReceiver: { endpoint: incidentEndpoint, passphrase: "something" },
  });
  const quirrelClient = new QuirrelClient<null>({
    async handler() {},
    route: "/",
    config: {
      quirrelBaseUrl: getAddress(quirrelServer.server),
      applicationBaseUrl: endpoint,
    },
  });

  const job = await quirrelClient.enqueue(null, {
    id: "@cron",
    repeat: { cron: "* * * * *" },
  });
  await job.invoke();
  await delay(10);
  expect(callCount).toBe(1);
  expect((await quirrelClient.getById("@cron"))?.count).toBe(2);

  await job.invoke();
  await delay(10);
  expect(callCount).toBe(2);
  expect((await quirrelClient.getById("@cron"))?.count).toBe(3);

  await job.invoke();
  await delay(1000);
  expect(lastWasError).toBe(true);

  expect(lastIncident?.incident.body).toContain("exploded");

  await job.invoke();
  await delay(10);
  expect(callCount).toBe(4);
  expect(lastWasError).toBe(false);
  expect((await quirrelClient.getById("@cron"))?.count).toBe(5);

  await applicationServer.close();
  await incidentReceiver.close();
  await quirrelServer.teardown();
});
