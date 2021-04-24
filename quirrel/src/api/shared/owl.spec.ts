import { cron, every, isValidTimezone } from "./owl";

describe("owl config", () => {
  test("isValidTimezone", () => {
    expect(isValidTimezone("Etc/UTC")).toBe(true);
    expect(isValidTimezone("Europe/Berlin")).toBe(true);
    expect(isValidTimezone("Europe/NonExistantCity")).toBe(false);
  });
  describe("cron", () => {
    describe("when passed a secondly job", () => {
      it("returns the next second", () => {
        expect(
          cron(
            new Date(2020, 10, 10, 10, 10, 10, 0),
            "* * * * * *" // every second
          )
        ).toEqual(new Date(2020, 10, 10, 10, 10, 11, 0));
      });
    });

    it("respects timezones", () => {
      expect(
        cron(
          new Date("2021-04-24T12:35:44.447Z"),
          "@daily;Europe/Berlin" // every second
        )
      ).toEqual(new Date("2021-04-25T00:00:00.000+02:00"));
    });

    describe("when using L (last day)", () => {
      it("returns the correct last day of the month (repro #230)", () => {
        expect(cron(new Date("2020-03-30"), "0 0 10 L * *")).toEqual(
          new Date("2020-03-31T10:00:00Z")
        );
        expect(cron(new Date("2020-04-29"), "0 0 10 L * *")).toEqual(
          new Date("2020-04-30T10:00:00Z")
        );
      });
    });
  });

  describe("every", () => {
    it("returns the next iteration", () => {
      expect(
        every(
          new Date(2020, 10, 10, 10, 10, 10, 0),
          "1000" // every second)
        )
      ).toEqual(new Date(2020, 10, 10, 10, 10, 11, 0));
    });
  });
});
