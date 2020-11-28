import { createServer, QuirrelServerConfig } from "./scheduler";
import { getLogger, LoggerType } from "./shared/logger";
import { createWorker, QuirrelWorkerConfig } from "./worker";

export type QuirrelConfig = Omit<QuirrelServerConfig, "logger"> &
  Omit<QuirrelWorkerConfig, "enableUsageMetering" | "logger"> & {
    logger: LoggerType;
  };

export async function runQuirrel(config: QuirrelConfig) {
  const logger = getLogger(config.logger);

  const server = await createServer({ ...config, logger });
  const worker = await createWorker({
    ...config,
    enableUsageMetering: !!config.passphrases?.length,
    logger,
  });

  return {
    server,
    worker,
    httpServer: server.server,
    async close() {
      await Promise.all([server.close(), worker.close()]);
    },
  };
}
