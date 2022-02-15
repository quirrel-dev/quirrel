import { QuirrelClient } from "..";
import http from "http";
import { getAddress } from "./util";

test("network unreliable", async () => {
  let callNumber = 0;
  const server = http
    .createServer((req, res) => {
      callNumber++;
      if (callNumber === 1) {
        // abort connection
        res.socket.end();
      } else if (callNumber === 2) {
        res.statusCode = 200;
        res.end();
      }
    })
    .listen(0);

  const quirrel = new QuirrelClient({
    route: "",
    async handler() {},
    config: {
      quirrelBaseUrl: getAddress(server),
      applicationBaseUrl: `http://localhost:4000`,
    },
  });

  const response = await quirrel.makeRequest("/");
  expect(response.status).toBe(200);

  expect(callNumber).toBe(2);

  server.close();
});
