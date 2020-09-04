import fastify from "fastify";
import health from "./routes/health";

const app = fastify({
    logger: true
})

app.register(health, { prefix: "/health" })

export async function createServer(port: number = 3000) {
    await app.listen(port)

    return {
        port,
        async close() {
            app.log.info("Closing.");
            await app.close()
        }
    }
}