import { GenericContainer, Wait } from "testcontainers";
import { runQuirrel } from "../src";
import axios from "axios";

export async function run() {
  const redis = await new GenericContainer("redis")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
    .start();

  const { close } = await runQuirrel({
    port: 4321,
    redis: {
      host: redis.getContainerIpAddress(),
      port: redis.getMappedPort(6379),
    },
  });

  async function teardown() {
    await close();
    await redis.stop();
  }

  return {
    teardown,
    client: axios.create({ baseURL: "http://localhost:4321" }),
  };
}
