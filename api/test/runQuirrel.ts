import { runQuirrel } from "../src";
import * as Redis from "ioredis"

export async function run(passphrases?: string[]) {
  const { httpServer, close } = await runQuirrel({
    port: 0,
    redis: process.env.REDIS_URL,
    passphrases,
    disableTelemetry: true
  });

  const redis = new Redis(process.env.REDIS_URL)

  return {
    teardown: close,
    server: httpServer,
    redis
  };
}
