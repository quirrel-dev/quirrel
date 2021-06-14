import { Logger } from "./logger";
import * as uuid from "uuid";
import pino, { Logger as PinoLogger } from "pino";
import { JobDTO } from "../../client/job";

export class StructuredLogger implements Logger {
  constructor(public readonly log: PinoLogger = pino()) {}

  started(address: string, telemetryEnabled: boolean) {
    this.log.info(`Listening on ${address}`);

    if (telemetryEnabled) {
      this.log.info(`
      Quirrel collects completely anonymous telemetry data about general usage,
      opt-out by setting the DISABLE_TELEMETRY environment variable.`);
    }
  }

  executionErrored(
    job: { tokenId: string; id: string; endpoint: string; body: string },
    error: string
  ): void {
    this.log.error({ error, job }, "Caught error during execution");
  }
  jobCreated(
    job: JobDTO & {
      tokenId: string;
    }
  ): void {
    this.log.info({ job }, "Created job.");
  }
  jobDeleted(job: { endpoint: string; id: string; tokenId: string }): void {
    this.log.info({ job }, "Deleted job.");
  }
  startingExecution(job: {
    id: string;
    tokenId: string;
    endpoint: string;
    body: string;
  }): () => void {
    const child = this.log.child({ correlationId: uuid.v4() });

    child.info({ job }, "Started execution of job.");
    return () => {
      child.info({ job }, "Ended execution of job");
    };
  }
}
