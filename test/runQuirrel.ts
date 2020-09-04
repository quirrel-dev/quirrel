import { GenericContainer } from "testcontainers"
import { createServer } from "../src/scheduler";
import axios from "axios"

export async function run() {
    const redis = await new GenericContainer("redis").withExposedPorts(6379).start();

    const { close, port } = await createServer(4321);
    
    async function teardown() {
        await close();
        await redis.stop()
    }

    return {
        teardown,
        client: axios.create({ baseURL: "http://localhost:" + port })
    }
}