import { AxiosInstance } from "axios"
import { run } from "./runQuirrel"

describe("health", () => {
    let client: AxiosInstance;
    let teardown: () => Promise<void>;
    
    beforeAll(async () => {
        const res = await run()
        client = res.client;
        teardown = res.teardown;
    })

    afterAll(async () => {
        await teardown()
    })

    test("health", async () => {
        const { data, status } = await client.get("/health")

        expect(status).toBe(200);
        expect(data).toEqual({ redis: "up" });
    })
})