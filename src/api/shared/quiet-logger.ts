import { Logger } from "./logger";
import { JobDTO } from "../../client/job";
import { QueuesUpdateCronBody } from "../scheduler/types/queues/update-cron";
import { getQueueName } from "./dx-logger";

export class QuietLogger implements Logger {
  started() {}

  executionErrored(
    job: { tokenId: string; id: string; endpoint: string; body: string },
    error: string
  ) {
    console.error("Caught error during execution:", error, job);
  }
  jobCreated(
    job: JobDTO & {
      tokenId: string;
    }
  ) {
    if (job.id === "@cron") {
      return;
    }

    console.log(
      `Created Job on ${getQueueName(job.endpoint)}, #${
        job.id
      }, ${job.body.slice(0, 20)}`
    );
  }

  cronUpdated(crons: QueuesUpdateCronBody, deleted: string[]) {
    if (crons.dryRun) {
      return;
    }

    console.log(
      "Updated Cron jobs: " +
        crons.crons.map((c) => c.route + ": " + c.schedule).join("; ")
    );
  }

  jobDeleted(
    job: JobDTO & {
      tokenId: string;
    }
  ): void {
    console.log(`Deleted job ${job.id} on ${getQueueName(job.endpoint)}`);
  }

  startingExecution(job: {
    id: string;
    tokenId: string;
    endpoint: string;
    body: string;
  }): () => void {
    console.log(
      `Starting execution of ${getQueueName(job.endpoint)}, ${job.id} ...`
    );
    return () => {
      console.log(`Success.`);
    };
  }
}
