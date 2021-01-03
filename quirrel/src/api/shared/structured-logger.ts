import { Logger } from "./logger";
import * as uuid from "uuid";
import pino from "pino";
import { JobDTO } from "../../client/job";

export class StructuredLogger implements Logger {
  public readonly pino = pino();

  started(address: string, telemetryEnabled: boolean) {
    this.pino.info(`Listening on ${address}`);

    if (telemetryEnabled) {
      this.pino.info(`
      Quirrel collects completely anonymous telemetry data about general usage,
      opt-out by setting the DISABLE_TELEMETRY environment variable.`);
    }
  }

  executionErrored(
    job: { tokenId: string; id: string; endpoint: string; body: string },
    error: string
  ): void {
    this.pino.error({ error, job }, "Caught error during execution");
  }
  jobCreated(
    job: JobDTO & {
      tokenId: string;
    }
  ): void {
    this.pino.info({ job }, "Created job.");
  }
  jobDeleted(job: { endpoint: string; id: string; tokenId: string }): void {
    this.pino.info({ job }, "Deleted job.");
  }
  startingExecution(job: {
    id: string;
    tokenId: string;
    endpoint: string;
    body: string;
  }): () => void {
    const child = this.pino.child({ correlationId: uuid.v4() });

    child.info({ job }, "Started execution of job.");
    return () => {
      child.info({ job }, "Ended execution of job");
    };
  }
}
