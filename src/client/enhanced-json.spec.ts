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

  describe(".stringify", () => {
    it("should not include SuperJSON stuff when not needed", () => {
      const input = { a: "regular object" };
      expect(EnhancedJSON.stringify(input)).toEqual('{"a":"regular object"}');
      expect(EnhancedJSON.parse(EnhancedJSON.stringify(input))).toEqual(input);

      expect(
        EnhancedJSON.parse(EnhancedJSON.stringify(new Date(10000)))
      ).toEqual(new Date(10000));
    });
  });

  it("should include SuperJSON stuff when needed", () => {
    const input = new Date(10000);
    expect(EnhancedJSON.stringify(input)).toEqual(
      '{"json":"1970-01-01T00:00:10.000Z","_superjson":{"values":["Date"]}}'
    );
    expect(EnhancedJSON.parse(EnhancedJSON.stringify(input))).toEqual(input);
  });
});
