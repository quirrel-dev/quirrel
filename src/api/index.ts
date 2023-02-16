import { createServer, QuirrelServerConfig } from "./scheduler/index.js";
import { getLogger, LoggerType } from "./shared/logger.js";
import { createWorker, QuirrelWorkerConfig } from "./worker/index.js";
import { Telemetrist } from "./shared/telemetrist.js";
import { env } from "process"

export type QuirrelConfig = Omit<QuirrelServerConfig, "logger"> &
  Omit<QuirrelWorkerConfig, "enableUsageMetering" | "logger"> & {
    logger?: LoggerType;
  };

export async function runQuirrel(config: QuirrelConfig) {
  const logger = getLogger(config.logger);

  const server = await createServer({ ...config, logger });
  const worker = await createWorker({
    ...config,
    enableUsageMetering: !!config.passphrases?.length,
    logger,
  });

  if (!config.disableTelemetry) {
    new Telemetrist(config.runningInDocker ?? false).record(
      `/version/${env.npm_package_version}`
    );
  }

  return {
    server,
    worker,
    httpServer: server.server,
    async close() {
      await Promise.all([server.close(), worker.close()]);
    },
  };
}
