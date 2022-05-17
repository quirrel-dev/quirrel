import { QuirrelClient } from "..";
import { symmetric } from "secure-webhooks";
import { run } from "../../api/test/runQuirrel";
import { getAddress } from "./util";

test("migration", async () => {
  process.env.NODE_ENV = "production";
  const newToken = "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk";
  const oldToken = "asdasidjkl3n12kln12kl23jklasmdkl";
  const client = new QuirrelClient({
    handler: async () => {},
    route: "",
    config: {
      token: newToken,
      oldToken,
      quirrelBaseUrl: "unused",
      applicationBaseUrl: "unused",
    },
  });

  async function requestWith(token: string) {
    const body = JSON.stringify("hello world");
    const signature = symmetric.sign(body, token);
    const { status } = await client.respondTo(body, {
      "x-quirrel-signature": signature,
    });
    return status;
  }

  expect(await requestWith(newToken)).toBe(200);
  expect(await requestWith(oldToken)).toBe(200);
  expect(await requestWith("wrong token")).toBe(401);
});

test("migration read + write", async () => {
  const passphrase = "password";
  const appId = "migration-test";
  const oldServer = await run("Mock", {
    passphrases: [passphrase],
  });
  const newServer = await run("Mock", {
    passphrases: [passphrase],
  });

  const oldToken = await oldServer.app.app.tokens?.create(appId);
  const newToken = await newServer.app.app.tokens?.create(appId);
  expect(oldToken).toBeDefined();
  expect(newToken).toBeDefined();

  const oldClient = new QuirrelClient({
    handler: async () => {},
    route: "",
    config: {
      token: oldToken,
      quirrelBaseUrl: getAddress(oldServer.server),
      applicationBaseUrl: "unused",
    },
  });

  const newClient = new QuirrelClient({
    handler: async () => {},
    route: "",
    config: {
      token: newToken,
      oldToken,
      quirrelBaseUrl: getAddress(newServer.server),
      quirrelOldBaseUrl: getAddress(oldServer.server),
      applicationBaseUrl: "unused",
    },
  });

  // get: should iterate through both
  const jobAOnOld = await oldClient.enqueue("a", {
    delay: "1h",
  });
  await newClient.enqueue("b", {
    delay: "1h",
  });
  const allJobs = [];
  for await (const jobs of newClient.get()) {
    allJobs.push(...jobs);
  }
  expect(allJobs).toHaveLength(2);

  // .getById should look at old
  expect(await newClient.getById(jobAOnOld.id)).toBeTruthy();

  // override: false. if job already exists on old instance, let it stay there
  await oldClient.enqueue("old payload", {
    id: "foo",
    delay: "1h",
  });
  const jobThatAlreadyExists = await newClient.enqueue("new payload", {
    id: "foo",
    delay: "1h",
  });
  expect(jobThatAlreadyExists.body).toEqual("old payload");

  const jobThatAlreadyExistsOnNew = await (newClient as any).fetchAgainstCurrent(
    "/foo"
  );
  expect(jobThatAlreadyExistsOnNew.status).toBe(404);

  // override: false. if job doesn't exist on old instance, it should be on new
  await newClient.enqueue("new payload", {
    id: "override-false-on-new",
    delay: "1h",
  });
  const jobOnNew = await (newClient as any).fetchAgainstCurrent(
    "/override-false-on-new"
  );
  expect(jobOnNew.status).toBe(200);

  // override: true. if job already exists on old instance, it should be deleted
  await oldClient.enqueue("old payload", {
    id: "override-true",
    delay: "1h",
  });
  await newClient.enqueue("new payload", {
    id: "override-true",
    delay: "1h",
    override: true,
  });
  expect(
    (await (oldClient as any).fetchAgainstCurrent("/override-true")).status
  ).toBe(404);
  expect(
    (await (newClient as any).fetchAgainstCurrent("/override-true")).status
  ).toBe(200);

  // delete: should run against both instances
  await oldClient.enqueue("old payload", {
    id: "delete",
    delay: "1h",
  });
  expect(await newClient.delete("delete")).toBe(true);
  expect(await oldClient.getById("delete")).toBeNull();

  await newClient.enqueue("new payload", {
    id: "delete",
    delay: "1h",
  });
  expect(await newClient.delete("delete")).toBe(true);
  expect(await newClient.getById("delete")).toBeNull();

  // invoke: should look at both instances
  await oldClient.enqueue("", {
    id: "invoke",
    delay: "1h",
  });
  expect(await newClient.invoke("invoke")).toBe(true);

  await newClient.enqueue("", {
    id: "invoke-2",
    delay: "1h",
  });
  expect(await newClient.invoke("invoke-2")).toBe(true);

  await oldServer.teardown();
  await newServer.teardown();
});
