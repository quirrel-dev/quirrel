import { runQuirrel as _runQuirrel } from "quirrel";
import IORedis from "ioredis-mock";

export async function runQuirrel({ port = 9181 }: { port?: number } = {}) {
  const ioredis = new IORedis();
  const quirrelServer = await _runQuirrel({
    port,
    logger: "none",
    redisFactory: () => {
      return ioredis.createConnectedClient() as any;
    },
  });

  return {
    cleanup: quirrelServer.close,
  };
}
