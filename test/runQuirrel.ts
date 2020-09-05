import { GenericContainer, Wait } from "testcontainers";
import { runQuirrel } from "../src";
import axios from "axios";
import * as findFreePort from "find-free-port";

export async function run(passphrases?: string[]) {
  const redis = await new GenericContainer("redis")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
    .start();

  const [ port ] = await findFreePort(3000);

  const { close } = await runQuirrel({
    port,
    redis: {
      host: redis.getContainerIpAddress(),
      port: redis.getMappedPort(6379),
    },
    passphrases
  });

  async function teardown() {
    await close();
    await redis.stop();
  }

  return {
    teardown,
    client: axios.create({ baseURL: "http://localhost:" + port }),
  };
}
