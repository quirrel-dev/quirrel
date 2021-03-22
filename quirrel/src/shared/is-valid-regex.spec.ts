import { isValidRegex } from "./is-valid-regex";

test(isValidRegex.name, () => {
  expect(isValidRegex("* * * * *")).toBe(true);
  expect(isValidRegex("* * * L * *")).toBe(true);
  expect(isValidRegex("* */2 * * *")).toBe(true);
  expect(isValidRegex("* * * W * *")).toBe(false);
  expect(isValidRegex("hello world")).toBe(false);
});
