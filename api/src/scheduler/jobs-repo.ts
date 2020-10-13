import type { Redis } from "ioredis";

import { Job, Queue, QueueEvents, QueueScheduler } from "@quirrel/bullmq";
import { POSTQueuesEndpointBody } from "./types/queues/POST/body";
import {
  encodeJobDescriptor,
  decodeJobDescriptor,
  HttpJob,
  HTTP_JOB_QUEUE,
  encodeQueueDescriptor,
} from "../shared/http-job";

import * as uuid from "uuid";
import { RepeatableRegistry } from "./repeatable-registry";

interface PaginationOpts {
  cursor: number;
  count?: number;
}

interface JobDTO {
  id: string;
  endpoint: string;
  body: unknown;
  runAt: string;
  repeat?: {
    every: number;
    limit: number;
    count: number;
  };
}

export class JobsRepo {
  private jobsScheduler;
  private jobsQueue;
  private jobsEvents;
  private repeatableRegistry;

  constructor(redis: Redis) {
    this.jobsScheduler = new QueueScheduler(HTTP_JOB_QUEUE, {
      connection: redis,
    });
    this.jobsEvents = new QueueEvents(HTTP_JOB_QUEUE, {
      connection: redis.duplicate(),
    });
    this.jobsQueue = new Queue<HttpJob>(HTTP_JOB_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
    this.repeatableRegistry = new RepeatableRegistry(redis);
  }

  private static toJobDTO(job: Job<HttpJob>): JobDTO {
    const { jobId, endpoint } = decodeJobDescriptor(job.id!);

    return {
      id: jobId,
      endpoint,
      body: job.data.body,
      runAt: new Date(job.timestamp + (job.opts.delay ?? 0)).toISOString(),
      repeat: job.opts.repeat
        ? {
            count: job.opts.repeat.count!,
            every: job.opts.repeat.every!,
            limit: job.opts.repeat.limit!,
          }
        : undefined,
    };
  }

  public async close() {
    await Promise.all([
      this.jobsScheduler.close(),
      this.jobsQueue.close(),
      this.jobsEvents.close(),
    ]);
  }

  public async find(
    byTokenId: string,
    endpoint: string,
    { count, cursor }: PaginationOpts
  ) {
    const { newCursor, jobs } = await this.jobsQueue.getJobsByName(
      encodeQueueDescriptor(byTokenId, endpoint),
      cursor,
      count
    );

    return {
      cursor: newCursor,
      jobs: jobs.map(JobsRepo.toJobDTO),
    };
  }

  public async findByTokenId(
    byTokenId: string,
    { count, cursor }: PaginationOpts
  ) {
    const { newCursor, jobs } = await this.jobsQueue.getJobsFromIdPattern(
      encodeJobDescriptor(byTokenId, "*", "*"),
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

  public async invoke(tokenId: string, endpoint: string, id: string) {
    const internalId = encodeJobDescriptor(tokenId, endpoint, id);

    const job: Job<HttpJob> | undefined = await this.jobsQueue.getJob(
      internalId
    );

    if (!job) {
      return undefined;
    }

    await job.promote();

    return JobsRepo.toJobDTO(job);
  }

  public async delete(tokenId: string, endpoint: string, id: string): Promise<JobDTO | null> {
    const jobDescriptor = encodeJobDescriptor(tokenId, endpoint, id);

    let job: Job<HttpJob> | undefined;

    job = await this.jobsQueue.getJob(jobDescriptor);
    if (job) {
      await job.remove();

      return JobsRepo.toJobDTO(job);
    } else {
      // it could be a repeatable job

      const repeatableJobKey = await this.repeatableRegistry.get(jobDescriptor);

      if (repeatableJobKey) {
        const result = await this.jobsQueue.removeRepeatableByKey(
          repeatableJobKey
        );

        return {
          id: "lel"
        } as any
      }
    }

    return null;
  }

  public async enqueue(
    tokenId: string,
    endpoint: string,
    { body, runAt, id, delay, repeat }: POSTQueuesEndpointBody
  ) {
    if (typeof id === "undefined") {
      id = uuid.v4();
    }

    if (runAt) {
      delay = Number(new Date(runAt)) - Date.now();
    }

    const queueDescriptor = encodeQueueDescriptor(tokenId, endpoint);
    const jobDescriptor = encodeJobDescriptor(tokenId, endpoint, id);

    const job = await this.jobsQueue.add(
      queueDescriptor,
      {
        body,
      },
      {
        delay,
        repeat: !!repeat ? {
          ...repeat,
          jobId: jobDescriptor,
          tz: "UTC",
        } : undefined,
        jobId: jobDescriptor,
      }
    );

    if (repeat) {
      const [ ,, repeatKeyB64 ] = job.id!.split(":");
      const repeatKey = Buffer.from(repeatKeyB64, "base64").toString();
      await this.repeatableRegistry.register(jobDescriptor, repeatKey, repeat);
    }

    return JobsRepo.toJobDTO(job);
  }

  public onEvent(
    requesterTokenId: string,
    cb: (
      event: string,
      job: { endpoint: string; id: string; reason?: string }
    ) => void
  ) {
    function onDelayed({ jobId }: { jobId: string; delay: number }) {
      const { tokenId, endpoint, jobId: id } = decodeJobDescriptor(jobId);
      if (tokenId === requesterTokenId) {
        cb("delayed", { endpoint, id });
      }
    }

    function onCompleted({ jobId }: { jobId: string }) {
      const { tokenId, endpoint, jobId: id } = decodeJobDescriptor(jobId);
      if (tokenId === requesterTokenId) {
        cb("completed", { endpoint, id });
      }
    }

    function onFailed({
      jobId,
      failedReason,
    }: {
      jobId: string;
      failedReason: string;
    }) {
      const { tokenId, endpoint, jobId: id } = decodeJobDescriptor(jobId);
      if (tokenId === requesterTokenId) {
        cb("failed", { endpoint, id, reason: failedReason });
      }
    }

    function onWaiting({ jobId }: { jobId: string }) {
      const { tokenId, endpoint, jobId: id } = decodeJobDescriptor(jobId);
      if (tokenId === requesterTokenId) {
        cb("waiting", { endpoint, id });
      }
    }

    function onRemoved({ jobId }: { jobId: string }) {
      const { tokenId, endpoint, jobId: id } = decodeJobDescriptor(jobId);
      if (tokenId === requesterTokenId) {
        cb("removed", { endpoint, id });
      }
    }

    this.jobsEvents.on("completed", onCompleted);
    this.jobsEvents.on("delayed", onDelayed);
    this.jobsEvents.on("waiting", onWaiting);
    this.jobsEvents.on("removed", onRemoved);
    this.jobsEvents.on("failed", onFailed);

    return () => {
      this.jobsEvents.removeListener("completed", onCompleted);
      this.jobsEvents.removeListener("delayed", onDelayed);
      this.jobsEvents.removeListener("waiting", onWaiting);
      this.jobsEvents.removeListener("removed", onRemoved);
      this.jobsEvents.removeListener("failed", onFailed);
    };
  }
}
