import { runQuirrel } from "./runQuirrel";
import { expect } from "chai";
import { expectTableCellToEqual, expectTableToBeEmpty } from "./invoke.spec";
import delay from "delay";
import { test } from "@playwright/test";

let cleanup: (() => Promise<void>)[] = [];

test.beforeEach(() => {
  cleanup = [];
});

test.afterEach(async () => {
  await Promise.all(cleanup.map((clean) => clean()));
});

test("jobs can be deleted", async ({ page }) => {
  const quirrel = await runQuirrel();
  cleanup.push(quirrel.cleanup);

  await quirrel.client.enqueue("to-be-deleted", {
    delay: "5sec",
    id: "to-be-deleted",
  });

  await page.goto("http://localhost:1234/pending");

  await page.click(`//tr[1]/td[5]/span/button[2]`);

  expect(await quirrel.client.getById("to-be-deleted")).to.be.null;
});

test("jobs disappear after being deleted", async ({ page }) => {
  const quirrel = await runQuirrel();
  cleanup.push(quirrel.cleanup);

  await page.goto("http://localhost:1234/pending");

  await delay(500);

  await expectTableToBeEmpty(page);

  const job = await quirrel.client.enqueue("to-be-deleted", {
    delay: "5sec",
    id: "to-be-deleted",
  });

  await delay(50);

  await expectTableCellToEqual(1, 2, "to-be-deleted", page);

  await job.delete();

  await delay(50);

  await expectTableToBeEmpty(page);
});
