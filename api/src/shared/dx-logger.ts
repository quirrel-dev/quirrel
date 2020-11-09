import { Logger } from "./logger";

export class DxLogger implements Logger {
  executionErrored(
    job: { tokenId: string; id: string; endpoint: string; body: string },
    error: Error
  ): void {
    console.error("Caught error during execution:", error, job);
  }
  jobCreated(job: {
    id: string;
    body: string;
    tokenId: string;
    endpoint: string;
  }): void {
    console.log(
      `Created job #${job.id} to execute against ${job.endpoint} with body ${job.body}.`
    );
  }
  startingExecution(job: {
    id: string;
    tokenId: string;
    endpoint: string;
    body: string;
  }): () => void {
    console.log(
      `Calling ${job.endpoint} with body ${job.body} to execute job #${job.id}: `
    );
    return () => {
      console.log("Done.");
    };
  }
}
