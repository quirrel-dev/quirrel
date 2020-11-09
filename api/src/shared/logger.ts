import type { FastifyLoggerInstance } from "fastify";
import { DxLogger } from "./dx-logger";
import { StructuredLogger } from "./structured-logger";

export interface Logger {
  jobCreated(): void;
  startingExecution(): { done: () => void };
  // ...
}

export type LoggerType = "dx" | "structured" | "none";

export function getLogger(type: LoggerType, logger: FastifyLoggerInstance) {
  switch (type) {
    case "none":
      return undefined;
    case "dx":
      return new DxLogger();
    case "structured":
      return new StructuredLogger(logger);
  }
}
