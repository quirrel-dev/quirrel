import { isValidCronExpression } from "./is-valid-cron";

test(isValidCronExpression.name, () => {
  expect(isValidCronExpression("* * * * *")).toBe(true);
  expect(isValidCronExpression("* * * L * *")).toBe(true);
  expect(isValidCronExpression("* */2 * * *")).toBe(true);
  expect(isValidCronExpression("* * * W * *")).toBe(false);
  expect(isValidCronExpression("hello world")).toBe(false);
});
