import { run } from "../../api/test/runQuirrel";
import { getAddress, makeSignal } from "./util";
import { QuirrelClient } from "..";
import http from "http";

const errorLogMock = jest.fn();
const logMock = jest.fn();
const receiverMock = jest.fn();

global.console = {
  ...global.console,
  error: errorLogMock,
  log: logMock,
};

describe("client logger", () => {
  let quirrelBaseUrl: string;
  let server: Awaited<ReturnType<typeof run>>;

  beforeAll(async () => {
    server = await run("Mock");
    quirrelBaseUrl = getAddress(server.server);
  });

  afterAll(async () => {
    server.teardown();
  });

  beforeEach(() => {
    errorLogMock.mockReset();
    logMock.mockReset();
  });

  it("works without passing a custom logger function", async () => {
    const quirrel = new QuirrelClient<{ result: "success" | "fail" }>({
      route: "routeName",
      async handler(payload) {
        if (payload.result === "fail") throw new Error("yey,errors");
      },
      config: {
        quirrelBaseUrl,
        applicationBaseUrl: "http://localhost",
      },
    });
    await quirrel.respondTo(JSON.stringify({ result: "success" }), {});
    expect(logMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenLastCalledWith("Received job to routeName", {
      result: "success",
    });
    expect(errorLogMock).toHaveBeenCalledTimes(0);

    await quirrel.respondTo(JSON.stringify({ result: "fail" }), {});
    expect(logMock).toHaveBeenCalledTimes(2);
    expect(logMock).toHaveBeenLastCalledWith("Received job to routeName", {
      result: "fail",
    });
    expect(errorLogMock).toHaveBeenCalledTimes(1);
    expect(errorLogMock).toHaveBeenLastCalledWith(
      "Error in job at routeName",
      { result: "fail" },
      new Error("yey,errors")
    );
  });

  it("allows passing a custom logger function", async () => {
    const receivedJob = jest.fn();
    const processingError = jest.fn();

    const quirrel = new QuirrelClient<{ result: "success" | "fail" }>({
      route: "",
      async handler(payload) {
        if (payload.result === "fail") throw new Error("fail");
      },
      config: {
        quirrelBaseUrl,
        applicationBaseUrl: "http://localhost",
      },
      options: {
        logger: {
          receivedJob,
          processingError,
        },
      },
    });
    await quirrel.respondTo(JSON.stringify({ result: "success" }), {});
    expect(receivedJob).toBeCalledTimes(1);
    expect(processingError).toBeCalledTimes(0);
    expect(logMock).toHaveBeenCalledTimes(0);
    expect(errorLogMock).toHaveBeenCalledTimes(0);

    await quirrel.respondTo(JSON.stringify({ result: "fail" }), {});
    expect(receivedJob).toBeCalledTimes(2);
    expect(processingError).toBeCalledTimes(1);
    expect(logMock).toHaveBeenCalledTimes(0);
    expect(errorLogMock).toHaveBeenCalledTimes(0);
  });
});
