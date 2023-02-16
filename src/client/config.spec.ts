import { withoutTrailingSlash } from "./config.js";

test("withoutTrailingSlash", () => {
  expect(withoutTrailingSlash("helloWorld.com/")).toBe("helloWorld.com");
  expect(withoutTrailingSlash("helloWorld.com")).toBe("helloWorld.com");
});
