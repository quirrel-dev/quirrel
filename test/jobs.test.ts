import { AxiosInstance } from "axios"
import { run } from "./runQuirrel"

describe("jobs", () => {
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

    test("post a job", async () => {
        const { data, status } = await client.post("/jobs", {
            endpoint: "http://localhost:3000",
            body: { "foo": "bar" }
        })

        expect(status).toBe(200);
        expect(data).toEqual({ redis: "up" });
    })
})