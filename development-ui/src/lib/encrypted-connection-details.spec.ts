import { extendTo32Characters } from "./encrypted-connection-details";

test("extendTo32Characters", () => {
  expect(extendTo32Characters("hello world")).toHaveLength(32);
  expect(
    extendTo32Characters("longerthan32charactersstringislongerthan32characters")
  ).toHaveLength(32);
});
