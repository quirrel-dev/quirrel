import { QuirrelClient } from "..";

describe("schema-check", () => {
  const quirrel = new QuirrelClient({
    async handler() {},
    route: "api/someAPI",
    config: {
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
      applicationBaseUrl: "https://anysite.com",
    },
  });

  it("catches Firebase-style dates", async () => {
    await expect(async () => {
      await quirrel.enqueue(null, {
        runAt: ({
          _seconds: 1608164625,
          _nanoseconds: 119000000,
        } as any) as Date,
      });
    }).rejects.toThrowError("Expected date, received object");
  });

  it("catches non-vercel/ms-compliant delays", async () => {
    await expect(async () => {
      await quirrel.enqueue(null, {
        delay: "10 shreks",
      });
    }).rejects.toThrowError(
      "Please provide a valid time span, according to https://github.com/vercel/ms"
    );
  });
});
