import request from "supertest";
import { run } from "./runQuirrel";

describe("owl-updates", () => {
  test("0.5 to 0.6", async () => {
    const quirrel = await run("Mock");

    await quirrel.redis.sadd(
      "queues:anonymous;https%3A%2F%2Fdemo-endpoint.com",
      ["some-api"]
    );

    await quirrel.redis.hset(
      "jobs:anonymous;https%3A%2F%2Fdemo-endpoint.com:some-api",
      {
        count: 1,
        exclusive: "false",
        max_times: "",
        payload: "something",
        retry: "[]",
        schedule_meta: "",
        schedule_type: "",
      }
    );

    await request(quirrel.server)
      .get(`/queues/https%3A%2F%2Fdemo-endpoint.com`)
      .expect(200, {
        cursor: null,
        jobs: [
          {
            id: "some-api",
            endpoint: "https://demo-endpoint.com",
            body: "something",
            runAt: "1970-01-01T00:00:00.000Z",
            exclusive: false,
            retry: [],
            count: 1,
          },
        ],
      });

    await quirrel.teardown();
  });
});
