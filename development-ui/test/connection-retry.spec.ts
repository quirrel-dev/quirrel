import { runQuirrel } from "quirrel";
import IORedis from "ioredis-mock";
import delay from "delay";
import { expect } from "chai";

let cleanup: (() => Promise<void>)[] = [];

beforeEach(() => {
  cleanup = [];
});

afterEach(async () => {
  await Promise.all(cleanup.map((clean) => clean()));
});

it("automatically connects when Quirrel is started", async () => {
  await page.goto("http://localhost:3000/pending");

  const attachingEl = await page.$("#attaching-to-quirrel");
  expect(attachingEl).to.exist;
  expect(await attachingEl?.innerText()).to.equal("Attaching to Quirrel ...");

  const ioredis = new IORedis();
  const quirrelServer = await runQuirrel({
    logger: "none",
    redisFactory: () => {
      return ioredis.createConnectedClient() as any;
    },
  });

  cleanup.push(quirrelServer.close);

  await delay(200);

  const tableEl = await page.$("[data-test-id=table]");
  expect(tableEl).to.exist;
});
