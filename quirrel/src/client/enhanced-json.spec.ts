import * as EnhancedJSON from "./enhanced-json";

describe("EnhancedJSON", () => {
  describe("when parsing an old job with the new thing, old job being an", () => {
    test("an object", () => {
      const oldJob = JSON.stringify({
        userId: 123,
      });

      expect(EnhancedJSON.parse(oldJob)).toEqual({
        userId: 123,
      });
    });

    test("a string", () => {
      const oldJob = JSON.stringify("foo-bar");

      expect(EnhancedJSON.parse(oldJob)).toEqual("foo-bar");
    });

    test("null", () => {
      const oldJob = JSON.stringify(null);

      expect(EnhancedJSON.parse(oldJob)).toEqual(null);
    });
  });
});
