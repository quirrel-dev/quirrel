import { EventEmitter } from "events";
import type * as http from "http";
import type { AddressInfo } from "ws";

export type Backend = "Mock" | "Redis";

export function describeAcrossBackends(
  topic: string,
  runTests: (backend: Backend) => void
) {
  describe(topic, () => {
    describe("Redis", () => {
      runTests("Redis");
    });

    describe("Mock", () => {
      runTests("Mock");
    });
  });
}

type Signal = ((key?: string) => Promise<void>) & {
  signal(key?: string): void;
};

export function makeSignal(): Signal {
  const emitter = new EventEmitter();

  function waitForSignal(key: string = "") {
    return new Promise<void>((resolve) => {
      emitter.on(key, resolve);
    });
  }

  waitForSignal.signal = (key: string = "") => {
    emitter.emit(key);
  };

  return waitForSignal;
}

function removeFirstStackLine(string: string): string {
  return string.replace(/\n.*\n/, "");
}

export function waitUntil(
  predicate: () => boolean,
  butMax: number,
  interval = 20
) {
  const potentialError = new Error(
    `Predicate was not fulfilled on time (${predicate.toString()})`
  ) as any;
  potentialError.showDiff = false;
  potentialError.stack = removeFirstStackLine(potentialError.stack!);

  return new Promise<void>((resolve, reject) => {
    const check = setInterval(() => {
      if (predicate()) {
        clearInterval(check);
        clearTimeout(max);
        resolve();
      }
    }, interval);

    const max = setTimeout(() => {
      clearInterval(check);
      reject(potentialError);
    }, butMax);
  });
}

export function expectToBeInRange(
  value: number,
  [from, to]: [from: number, to: number]
) {
  expect(value).toBeGreaterThanOrEqual(from);
  expect(value).toBeLessThanOrEqual(to);
}

export function expectToHaveEqualMembers(actual: any[], expected: any[]) {
  expect(actual).toHaveLength(expected.length);
  for (const e of expected) {
    expect(actual).toContainEqual(e);
  }
}

export async function stopTime(doIt: () => Promise<void>) {
  const start = Date.now();
  await doIt();
  const end = Date.now();
  return end - start;
}

export function getAddress(server: http.Server): string {
  let { address, port } = server.address() as AddressInfo;

  if (address.startsWith("::")) {
    address = "localhost";
  }

  return `http://${address}:${port}`;
}
