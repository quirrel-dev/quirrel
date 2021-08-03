import { idempotent } from "./queue-repo";

describe("idempotent", () => {
  it("only executes once per key", async () => {
    const log: string[] = [];

    const logOnce = idempotent(async (line: string) => {
      log.push(line);
    });
    await logOnce("1");
    await logOnce("1");
    await logOnce("2");

    expect(log).toEqual(["1", "2"]);
  });

  it("throws errors", async () => {
    const thrower = idempotent(async () => {
      throw new Error("error");
    });
    await expect(thrower()).rejects.toThrowError("error");
    await expect(thrower()).rejects.toThrowError("error");
  });
});
