import { QuirrelClient } from "../src";

describe("DX", () => {
  const quirrel = new QuirrelClient({
    baseUrl: "https://quirrel.mock.com",
    encryptionSecret: "4ws8syoOgeQX6WFvXuUneGNwy7QvLxpk",
  });

  it("defaults endpoints to https, if no protocol given", async () => {
    await expect(async () => {
      await quirrel.enqueue("anysite.com/api/someAPI", {
        body: "",
      });
    }).rejects.toThrowError(
      "request to https://quirrel.mock.com/queues/https%3A%2F%2Fanysite.com%2Fapi%2FsomeAPI failed, reason: getaddrinfo ENOTFOUND quirrel.mock.com"
    );
  });
});
