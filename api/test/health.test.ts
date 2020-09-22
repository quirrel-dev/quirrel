import * as request from "supertest";
import { run } from "./runQuirrel";
import type * as http from "http";

describe("health", () => {
  let quirrel: http.Server;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    const res = await run();
    quirrel = res.server;
    teardown = res.teardown;
  });

  afterAll(async () => {
    await teardown();
  });

  test("health", async () => {
    await request(quirrel).get("/health").expect(200, { redis: "up" });
  });
});
