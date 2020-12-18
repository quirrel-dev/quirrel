import { QuirrelClient } from "../src";

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
});
