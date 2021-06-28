import delay from "delay";
import { expect } from "chai";
import { runQuirrel } from "./runQuirrel";

let cleanup: (() => Promise<void>)[] = [];

beforeEach(() => {
  cleanup = [];
});

afterEach(async () => {
  await Promise.all(cleanup.map((clean) => clean()));
});

export async function expectToShowAttachingToQuirrel() {
  const attachingEl = await page.$("#attaching-to-quirrel");
  expect(attachingEl).to.exist;
  expect(await attachingEl?.innerText()).to.equal("Attaching to Quirrel ...");
}

export async function expectToShowJobTable() {
  const tableEl = await page.$("[data-test-class=table]");
  expect(tableEl).to.exist;
  expect(await tableEl?.textContent()).to.equal(
    ["Endpoint", "ID", "Run At", "Payload"].join("")
  );
}

it("automatically connects when Quirrel is started", async () => {
  await page.goto("http://localhost:1234/pending");

  await expectToShowAttachingToQuirrel();

  const quirrelServer = await runQuirrel();

  cleanup.push(quirrelServer.cleanup);

  await delay(550);

  await expectToShowJobTable();

  await quirrelServer.cleanup();

  await expectToShowAttachingToQuirrel();
});
