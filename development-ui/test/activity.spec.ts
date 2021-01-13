import delay from "delay";
import { runQuirrel } from "./runQuirrel";
import { expect } from "chai";

let cleanup: (() => Promise<void>)[] = [];

beforeEach(() => {
  cleanup = [];
});

afterEach(async () => {
  await Promise.all(cleanup.map((clean) => clean()));
});

export async function expectTableCellToEqual(
  row: number,
  column: number,
  value: string,
  _page = page
) {
  const rowEl = await _page.$(`//tr[${row}]`);
  expect(rowEl).to.exist;
  expect(
    await (await _page.$(`//tr[${row}]/td[${column}]`))?.innerText()
  ).to.equal(value);
}

export async function expectTableToBeEmpty(_page = page) {
  const table = await _page.$(`tbody`);
  expect(await table?.innerHTML()).to.equal("");
}

it("shows activity feed", async () => {
  const quirrel = await runQuirrel();
  cleanup.push(quirrel.cleanup);

  await page.goto("http://localhost:3000/activity");

  await delay(500);

  await expectTableToBeEmpty(page);

  const job = await quirrel.client.enqueue("job", { delay: "1min", id: "job" });
  await delay(50);
  await expectTableCellToEqual(1, 3, "scheduled", page);

  await job.delete();
  await delay(50);
  await expectTableCellToEqual(2, 3, "deleted", page);

  const job2 = await quirrel.client.enqueue("job-1", {
    delay: "1min",
    id: "job-2",
    repeat: {
      times: 2,
      every: "1sec",
    },
  });
  await delay(50);
  await expectTableCellToEqual(3, 3, "scheduled", page);

  await job2.invoke();
  await delay(50);
  await expectTableCellToEqual(4, 3, "invoked", page);
  await expectTableCellToEqual(5, 3, "started", page);
  await expectTableCellToEqual(6, 3, "completed", page);
  await expectTableCellToEqual(7, 3, "rescheduled", page);
});
