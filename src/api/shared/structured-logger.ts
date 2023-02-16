import { Logger } from "./logger.js";
import * as uuid from "uuid";
import pino from "pino";
import { JobDTO } from "../../client/job.js";
import { QueuesUpdateCronBody } from "../scheduler/types/queues/update-cron.js";

export class StructuredLogger implements Logger {
  constructor(
    public readonly log = pino.default({
      level: process.env.LOG_LEVEL || "trace",
    })
  ) {}

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
  cronUpdated(crons: QueuesUpdateCronBody, deleted: string[]): void {
    this.log.info({ crons, deleted }, "updated crons");
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
