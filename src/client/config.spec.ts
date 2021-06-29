import { withoutTrailingSlash } from "./config";

test("withoutTrailingSlash", () => {
  expect(withoutTrailingSlash("helloWorld.com/")).toBe("helloWorld.com");
  expect(withoutTrailingSlash("helloWorld.com")).toBe("helloWorld.com");
});
