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
