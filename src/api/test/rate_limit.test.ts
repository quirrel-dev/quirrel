import { run } from "./runQuirrel";
import request from "supertest";

test("rate limiter", async () => {
  const env = await run("Mock", {
    rateLimiter: {
      max: 2,
    },
  });

  const endpoint = "/queues/" + encodeURIComponent("https://example.com");

  const req = (token = "") =>
    request(env.server)
      .post(endpoint)
      .auth(token, { type: "bearer" })
      .send({ body: "" });

  await req("foo").expect(201);
  await req("foo").expect(201);
  await req("foo").expect(429);

  await req("bar").expect(201);

  await env.teardown();
});
