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

  it("defaults endpoints to https, if no protocol given", async () => {
    await expect(() => quirrel.enqueue("")).rejects.toThrowError(
      "request to https://quirrel.mock.com/queues/https%3A%2F%2Fanysite.com%2Fapi%2FsomeAPI failed, reason: getaddrinfo ENOTFOUND quirrel.mock.com"
    );
  });

  describe("when given a runAt in the past", () => {
    it("throws immediately", async () => {
      await expect(() =>
        quirrel.enqueue("", { runAt: new Date(0) })
      ).rejects.toThrowError("runAt must not be in the past.");

      await expect(() =>
        quirrel.enqueue("", { delay: -1 })
      ).rejects.toThrowError("delay must not be negative.");
    });
  });
});
