import { AxiosInstance } from "axios"
import { run } from "./runQuirrel"
import fastify, { FastifyInstance } from "fastify"
import delay from "delay"

describe("jobs", () => {
    let client: AxiosInstance;
    let teardown: () => Promise<void>;

    let server: FastifyInstance;
    let lastBody: any;
    
    beforeAll(async () => {
        const res = await run()
        client = res.client;
        teardown = res.teardown;

        const server = fastify();
        server.post("/", (request, reply) => {
            lastBody = request.body;
            reply.status(200);
        })
        await server.listen(5000);
    })

    afterAll(async () => {
        await teardown()
        await server.close();
    })

    test("post a job", async () => {
        const { status } = await client.post("/jobs", {
            endpoint: "http://localhost:5000/",
            body: { "foo": "bar" }
        })

        expect(status).toBe(200);

        await delay(300);

        expect(lastBody).toEqual({ "foo": "bar" });
    })
})