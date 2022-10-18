import delay from "delay";
import { expect } from "chai";
import { runQuirrel } from "./runQuirrel";
import { Page, test } from "@playwright/test";

let cleanup: (() => Promise<void>)[] = [];

test.beforeEach(() => {
  cleanup = [];
});

test.afterEach(async () => {
  await Promise.all(cleanup.map((clean) => clean()));
});

export async function expectToShowAttachingToQuirrel(page: Page) {
  const attachingEl = await page.$("#attaching-to-quirrel");
  expect(attachingEl).to.exist;
  expect(await attachingEl?.innerText()).to.equal("Attaching to Quirrel ...");
}

export async function expectToShowJobTable(page: Page) {
  const tableEl = await page.$("[data-test-class=table]");
  expect(tableEl).to.exist;
  expect(await tableEl?.textContent()).to.equal(
    ["Endpoint", "ID", "Run At", "Payload"].join("")
  );
}

test("automatically connects when Quirrel is started", async ({ page }) => {
  await page.goto("http://localhost:1234/pending");

  await expectToShowAttachingToQuirrel(page);

  const quirrelServer = await runQuirrel();

  cleanup.push(quirrelServer.cleanup);

  await delay(550);

  await expectToShowJobTable(page);

  await quirrelServer.cleanup();

  await expectToShowAttachingToQuirrel(page);
});
