import { QuirrelClient } from "..";
import { symmetric } from "secure-webhooks";

test("migration", async () => {
  process.env.NODE_ENV = "production";
  const newToken = "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk";
  const oldToken = "asdasidjkl3n12kln12kl23jklasmdkl";
  const client = new QuirrelClient({
    handler: async () => {},
    route: "",
    config: {
      token: newToken,
      oldToken,
      quirrelBaseUrl: "unused",
      applicationBaseUrl: "unused",
    },
  });

  async function requestWith(token: string) {
    const body = JSON.stringify("hello world");
    const signature = symmetric.sign(body, token);
    const { status } = await client.respondTo(body, {
      "x-quirrel-signature": signature,
    });
    return status;
  }

  expect(await requestWith(newToken)).toBe(200);
  expect(await requestWith(oldToken)).toBe(200);
  expect(await requestWith("wrong token")).toBe(401);
});
