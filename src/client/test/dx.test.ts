import { QuirrelClient } from "..";

describe("DX", () => {
  const quirrel = new QuirrelClient({
    async handler() {},
    route: "api/someAPI",
    config: {
      quirrelBaseUrl: "https://quirrel.mock.com",
      applicationBaseUrl: "anysite.com",
      encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
    },
  });

  describe("if no protocol given", () => {
    describe("in dev mode", () => {
      it("defaults endpoints to http", async () => {
        expect((quirrel as any).baseUrl).toBe(
          "https://quirrel.mock.com/queues/http%3A%2F%2Fanysite.com%2Fapi%2FsomeAPI"
        );
      });
    });

    describe("in prod mode", () => {
      it("defaults endpoints to https", async () => {
        const oldEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";
        const quirrel = new QuirrelClient({
          async handler() {},
          route: "api/someAPI",
          config: {
            quirrelBaseUrl: "https://quirrel.mock.com",
            applicationBaseUrl: "anysite.com",
            encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
          },
        });
        expect((quirrel as any).baseUrl).toBe(
          "https://quirrel.mock.com/queues/https%3A%2F%2Fanysite.com%2Fapi%2FsomeAPI"
        );
        process.env.NODE_ENV = oldEnv;
      });
    });
  });

  describe("when given a runAt in the past", () => {
    it("throws immediately", async () => {
      await expect(() =>
        quirrel.enqueue("", { runAt: new Date(0) })
      ).rejects.toThrowError("runAt must not be in the past");

      await expect(() =>
        quirrel.enqueue("", { delay: -1 })
      ).rejects.toThrowError("delay must be positive");
    });
  });

  describe("when given both retry and repeat", () => {
    it("throws immediately", async () => {
      await expect(() =>
        quirrel.enqueue("", {
          retry: ["1min"],
          repeat: { every: "200ms", times: 5 },
        })
      ).rejects.toThrowError("retry and repeat cannot be used together");
    });
  });

  describe("when overriding without id", () => {
    it("throws immediately", async () => {
      await expect(() =>
        quirrel.enqueue("", {
          override: true,
        })
      ).rejects.toThrowError("override requires id");
    });
  });
});
