import { replaceLocalhostWithDockerHost } from ".";

test("replaceLocalhostWithDockerHost", () => {
  expect(
    replaceLocalhostWithDockerHost("http://localhost:3000/api/queues/email")
  ).toEqual("http://host.docker.internal:3000/api/queues/email");
});
