import request from "supertest";
import { run } from "./runQuirrel";
import type http from "http";

function testAgainst(backend: "Redis" | "Mock") {
  describe(backend + " > health", () => {
    let quirrel: http.Server;
    let teardown: () => Promise<void>;

    beforeAll(async () => {
      const res = await run(backend);
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
}

testAgainst("Mock");
testAgainst("Redis");
