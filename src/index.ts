import { createServer, QuirrelServerConfig } from "./scheduler";
import { createWorker, QuirrelWorkerConfig } from "./worker";

type QuirrelConfig = QuirrelServerConfig & QuirrelWorkerConfig;

export async function runQuirrel(config: QuirrelConfig) {
    const server = await createServer(config);
    const worker = await createWorker(config);

    return {
        async close() {
            await Promise.all([
                server.close(),
                worker.close()
            ])
        }
    }
}