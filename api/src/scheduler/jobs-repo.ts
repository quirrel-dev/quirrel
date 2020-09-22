import type { Redis } from "ioredis";

import { Job, Queue, QueueScheduler } from "@quirrel/bullmq";
import { POSTQueuesEndpointBody } from "./types/queues/POST/body";
import {
  encodeJobDescriptor,
  decodeJobDescriptor,
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
    const { endpoint, jobId } = decodeJobDescriptor(job.id!);

    return {
      id: jobId,
      endpoint,
      body: job.data.body,
      runAt: new Date(Date.now() + (job.opts.delay ?? 0)).toISOString(),
    };
  }

  public async close() {
    await Promise.all([this.jobsScheduler.close(), this.jobsQueue.close()]);
  }

  public async find(byTokenId: string, endpoint: string, { count, cursor }: PaginationOpts = {}) {
    const { newCursor, jobs } = await this.jobsQueue.getJobFromIdPattern(
      encodeJobDescriptor(byTokenId, endpoint, "*"),
      cursor,
      count
    );

    return {
      cursor: newCursor,
      jobs: jobs.map(JobsRepo.toJobDTO),
    };
  }

  public async findById(tokenId: string, endpoint: string, id: string) {
    const internalId = encodeJobDescriptor(tokenId, endpoint, id);

    const job: Job<HttpJob> | undefined = await this.jobsQueue.getJob(
      internalId
    );
    return job ? JobsRepo.toJobDTO(job) : undefined;
  }

  public async delete(tokenId: string, endpoint: string, id: string) {
    const internalId = encodeJobDescriptor(tokenId, endpoint, id);

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
    endpoint: string,
    { body, runAt, id, delay }: POSTQueuesEndpointBody
  ) {
    if (typeof id === "undefined") {
      id = uuid.v4();
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
        jobId: encodeJobDescriptor(tokenId, endpoint, id),
      }
    );

    return JobsRepo.toJobDTO(job);
  }
}
