import { cron, every } from "./owl";

describe("owl config", () => {
  describe("cron", () => {
    describe("when passed a secondly job", () => {
      it("returns the next second", () => {
        expect(
          cron(
            new Date(2020, 10, 10, 10, 10, 10, 0),
            "* * * * * *" // every second)
          )
        ).toEqual(new Date(2020, 10, 10, 10, 10, 11, 0));
      });
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
