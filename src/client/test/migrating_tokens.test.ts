import { QuirrelClient } from "..";
import { symmetric } from "secure-webhooks";

test("migrating tokens", async () => {
  process.env.NODE_ENV = "production";

  const newToken = "foo";
  const oldToken = "bar";
  const client = new QuirrelClient({
    async handler() {},
    route: "/test",
    config: {
      token: newToken,
      oldToken,
      applicationBaseUrl: "http://something.com",
    },
  });

  const payload = JSON.stringify({ foo: "bar" });
  
  const signedFromNewServer = symmetric.sign(payload, newToken);
  const responseFromNewServer = await client.respondTo(payload, {
    "x-quirrel-signature": signedFromNewServer,
  });
  expect(responseFromNewServer.status).toBe(200);

  const signedFromOldServer = symmetric.sign(payload, oldToken);
  const responseFromOldServer = await client.respondTo(payload, {
    "x-quirrel-signature": signedFromOldServer,
  });
  expect(responseFromOldServer.status).toBe(200);
});
