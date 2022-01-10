import { QuirrelClient } from "..";
import { run } from "../../api/test/runQuirrel";
import http from "http";
import { getAddress, waitUntil } from "./util";

export function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

test("exclusive (repro #717)", async () => {
  const server = await run("Mock");

  const endpoint = http
    .createServer((req, res) => {
      let body = "";
      req.on("data", (data) => {
        body += data;
      });
      req.on("end", () => {
        quirrel.respondTo(body, req.headers).then(({ status, body }) => {
          res.write(body);
          res.statusCode === status;
          res.end();
        });
      });
    })
    .listen(0);

  const log: string[] = [];
  const quirrel = new QuirrelClient({
    route: "",
    async handler(payload: number) {
      log.push("started " + payload);
      await sleep(100);
      log.push("finished " + payload);
    },
    config: {
      quirrelBaseUrl: getAddress(server.server),
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      applicationBaseUrl: getAddress(endpoint),
    },
  });

  const inFiftyMS = new Date(Date.now() + 100);
  for (let i = 0; i < 3; i++) {
    await quirrel.enqueue(i, {
      exclusive: true,
      runAt: inFiftyMS,
    });
  }

  await waitUntil(() => log.length === 6, 1000);
  const i = (s: string) => log.indexOf(s);
  expect(i("finished 0") - i("started 0")).toBe(1);
  expect(i("finished 1") - i("started 1")).toBe(1);
  expect(i("finished 2") - i("started 2")).toBe(1);

  server.teardown();
  endpoint.close();
});
