import { JobDTO } from "../../client/job";
import { DxLogger } from "./dx-logger";
import { StructuredLogger } from "./structured-logger";

export interface Logger {
  started(address: string, telemetryEnabled: boolean): void;
  jobCreated(
    job: JobDTO & {
      tokenId: string;
    }
  ): void;
  jobDeleted(
    job: {
      endpoint: string;
      id: string;
      tokenId: string;
    }
  ): void;
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

export function getLogger(type: LoggerType): Logger | undefined {
  switch (type) {
    case "none":
      return undefined;
    case "dx":
      return new DxLogger();
    case "structured":
      return new StructuredLogger();
  }
}
