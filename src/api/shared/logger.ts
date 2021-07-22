import { JobDTO } from "../../client/job";
import { DxLogger } from "./dx-logger";
import { StructuredLogger } from "./structured-logger";
import pino, { Logger as PinoLogger } from "pino";
import { QueuesUpdateCronBody } from "../scheduler/types/queues/update-cron";

export interface Logger {
  log?: PinoLogger;
  started(address: string, telemetryEnabled: boolean): void;
  jobCreated(
    job: JobDTO & {
      tokenId: string;
    }
  ): void;
  cronUpdated(
    crons: QueuesUpdateCronBody,
    deleted: string[]
  ): void;
  jobDeleted(job: { endpoint: string; id: string; tokenId: string }): void;
  /**
   * @returns function to call when execution is done
   */
  startingExecution(job: {
    id: string;
    tokenId: string;
    endpoint: string;
    body: string;
  }): () => void;

  executionErrored(
    job: {
      id: string;
      tokenId: string;
      endpoint: string;
      body: string;
    },
    error: string
  ): void;
  // ...
}

export type LoggerType = "dx" | "structured" | "none";

export function getLogger(
  type: LoggerType,
  logger: PinoLogger = pino({ level: process.env.LOG_LEVEL || "trace" })
): Logger | undefined {
  switch (type) {
    case "none":
      return undefined;
    case "dx":
      return new DxLogger();
    case "structured":
      return new StructuredLogger(logger);
  }
}
