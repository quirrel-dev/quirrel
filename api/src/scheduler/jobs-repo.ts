import type { Redis } from "ioredis";

import { Job, Queue, QueueScheduler } from "@quirrel/bullmq";
import { POSTJobsBody } from "./types/jobs/POST/body";
import {
  encodeExternalJobId,
  encodeInternalJobId,
  decodeExternalJobId,
  decodeInternalJobId,
  HttpJob,
  HTTP_JOB_QUEUE,
} from "../shared/http-job";

import * as uuid from "uuid";

interface PaginationOpts {
  cursor?: number;
  count?: number;
}

interface JobDTO {
  id: string;
  idempotencyKey: string;
  endpoint: string;
  body: unknown;
  runAt: string;
}

export class JobsRepo {
  private jobsScheduler;
  private jobsQueue;

  constructor(redis: Redis) {
    this.jobsScheduler = new QueueScheduler(HTTP_JOB_QUEUE, {
      connection: redis,
    });
    this.jobsQueue = new Queue<HttpJob>(HTTP_JOB_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  private static toJobDTO(job: Job<HttpJob>): JobDTO {
    const { endpoint, idempotencyKey } = decodeInternalJobId(job.id!);

    return {
      id: encodeExternalJobId(endpoint, idempotencyKey),
      idempotencyKey,
      endpoint,
      body: job.data.body,
      runAt: new Date(Date.now() + (job.opts.delay ?? 0)).toISOString(),
    };
  }

  public async close() {
    await Promise.all([this.jobsScheduler.close(), this.jobsQueue.close()]);
  }

  public async find(byTokenId: string, { count, cursor }: PaginationOpts = {}) {
    const { newCursor, jobs } = await this.jobsQueue.getJobFromIdPattern(
      encodeInternalJobId(byTokenId, "*", "*"),
      cursor,
      count
    );

    return {
      cursor: newCursor,
      jobs: jobs.map(JobsRepo.toJobDTO),
    };
  }

  public async findById(tokenId: string, externalId: string) {
    const { endpoint, idempotencyKey } = decodeExternalJobId(externalId);
    const internalId = encodeInternalJobId(tokenId, endpoint, idempotencyKey);

    const job: Job<HttpJob> | undefined = await this.jobsQueue.getJob(
      internalId
    );
    return job ? JobsRepo.toJobDTO(job) : undefined;
  }

  public async delete(tokenId: string, externalId: string) {
    const { endpoint, idempotencyKey } = decodeExternalJobId(externalId);
    const internalId = encodeInternalJobId(tokenId, endpoint, idempotencyKey);

    const job: Job<HttpJob> | undefined = await this.jobsQueue.getJob(
      internalId
    );

    if (!job) {
      return null;
    }

    await job.remove();

    return JobsRepo.toJobDTO(job);
  }

  public async enqueue(
    tokenId: string,
    { endpoint, body, runAt, jobId, delay, idempotencyKey }: POSTJobsBody
  ) {
    if (!idempotencyKey) {
      idempotencyKey = jobId;
    }

    if (typeof jobId === "undefined") {
      jobId = uuid.v4();
    }

    if (runAt) {
      delay = Number(new Date(runAt)) - Date.now();
    }

    const job = await this.jobsQueue.add(
      "default",
      {
        body,
      },
      {
        delay,
        jobId: encodeInternalJobId(tokenId, endpoint, jobId),
      }
    );

    return JobsRepo.toJobDTO(job);
  }
}
