import delay from "delay";
import { runQuirrel } from "./runQuirrel";
import { expect } from "chai";
import { Page, test } from "@playwright/test";

let cleanup: (() => Promise<void>)[] = [];

test.beforeEach(() => {
  cleanup = [];
});

test.afterEach(async () => {
  await Promise.all(cleanup.map((clean) => clean()));
});

export async function expectTableCellToEqual(
  row: number,
  column: number,
  value: string,
  _page: Page
) {
  const rowEl = await _page.$(`//tr[${row}]`);
  expect(rowEl).to.exist;
  expect(
    await (await _page.$(`//tr[${row}]/td[${column}]`))?.innerText()
  ).to.equal(value);
}

export async function expectTableToBeEmpty(_page: Page) {
  const table = await _page.$(`tbody`);
  expect(await table?.innerHTML()).to.equal("");
}

test("allows invoking jobs", async ({ page }) => {
  const quirrel = await runQuirrel();
  cleanup.push(quirrel.cleanup);

  await page.goto("http://localhost:1234/pending");

  await delay(500);

  await expectTableToBeEmpty(page);

  await quirrel.client.enqueue("1", { delay: "1min", id: "1" });
  await quirrel.client.enqueue("2", { delay: "2min", id: "2" });
  await quirrel.client.enqueue("3", { delay: "3min", id: "3" });

  await delay(100);

  await expectTableCellToEqual(1, 2, "1", page);
  await expectTableCellToEqual(2, 2, "2", page);
  await expectTableCellToEqual(3, 2, "3", page);

  await page.click(`//tr[1]/td[5]/span/button[1]`);

  await delay(100);

  expect(quirrel.receivedJobs).to.contain("1");
});
