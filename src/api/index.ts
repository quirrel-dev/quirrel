import { createServer, QuirrelServerConfig } from "./scheduler";
import { getLogger, LoggerType } from "./shared/logger";
import { createWorker, QuirrelWorkerConfig } from "./worker";
import pack from "../../package.json";
import { Telemetrist } from "./shared/telemetrist";

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

  if (!config.disableTelemetry) {
    new Telemetrist(config.runningInDocker ?? false).record(
      `/version/${pack.version}`
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
