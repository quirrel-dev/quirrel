import { EnqueueJob } from "./types/queues/POST/body";
import { QueuesUpdateCronBody } from "./types/queues/update-cron";
import {
  encodeQueueDescriptor,
  decodeQueueDescriptor,
} from "../shared/queue-descriptor";

import * as uuid from "uuid";
import { cron } from "../shared/owl";
import Owl, { Job, Closable } from "@quirrel/owl";
import { QueueRepo } from "./queue-repo";
import { Redis } from "ioredis";

interface PaginationOpts {
  cursor: number;
  count?: number;
}

interface JobDTO {
  id: string;
  endpoint: string;
  body: string;
  runAt: string;
  exclusive: boolean;
  retry: number[];
  count: number;
  repeat?: {
    every?: number;
    times?: number;
    count: number;
    cron?: string;
  };
}

export class JobsRepo implements Closable {
  protected producer;
  public readonly queueRepo: QueueRepo;

  constructor(protected readonly owl: Owl<"every" | "cron">, redis: Redis) {
    this.producer = this.owl.createProducer();
    this.queueRepo = new QueueRepo(redis, this);
  }

  private static toJobDTO(job: Job<"every" | "cron">): JobDTO {
    const { endpoint } = decodeQueueDescriptor(job.queue);

    return {
      id: job.id,
      endpoint,
      body: job.payload,
      runAt: job.runAt.toISOString(),
      exclusive: job.exclusive,
      retry: job.retry,
      count: job.count,
      repeat: job.schedule
        ? {
            count: job.count,
            cron: job.schedule?.type === "cron" ? job.schedule.meta : undefined,
            every:
              job.schedule?.type === "every" ? +job.schedule.meta : undefined,
            times: job.schedule?.times,
          }
        : undefined,
    };
  }

  public async close() {
    await this.producer.close();
  }

  public async find(
    byTokenId: string,
    endpoint: string,
    { count, cursor }: PaginationOpts
  ) {
    const { newCursor, jobs } = await this.producer.scanQueue(
      encodeQueueDescriptor(byTokenId, endpoint),
      cursor,
      count
    );

    return {
      cursor: newCursor,
      jobs: jobs.map(JobsRepo.toJobDTO),
    };
  }

  public async findAll({ count, cursor }: PaginationOpts) {
    const { newCursor, jobs } = await this.producer.scanQueuePattern(
      encodeQueueDescriptor("*", "*"),
      cursor,
      count
    );

    return {
      cursor: newCursor,
      jobs: jobs.map((job) => {
        const { tokenId } = decodeQueueDescriptor(job.queue);
        return {
          ...JobsRepo.toJobDTO(job),
          tokenId,
        };
      }),
    };
  }

  public async findByTokenId(
    byTokenId: string,
    { count, cursor }: PaginationOpts
  ) {
    const { newCursor, jobs } = await this.producer.scanQueuePattern(
      encodeQueueDescriptor(byTokenId, "*"),
      cursor,
      count
    );

    return {
      cursor: newCursor,
      jobs: jobs.map(JobsRepo.toJobDTO),
    };
  }

  public async findById(tokenId: string, endpoint: string, id: string) {
    const job = await this.producer.findById(
      encodeQueueDescriptor(tokenId, endpoint),
      id
    );
    return job ? JobsRepo.toJobDTO(job) : undefined;
  }

  public async invoke(tokenId: string, endpoint: string, id: string) {
    return await this.producer.invoke(
      encodeQueueDescriptor(tokenId, endpoint),
      id
    );
  }

  public async delete(tokenId: string, endpoint: string, id: string) {
    return await this.producer.delete(
      encodeQueueDescriptor(tokenId, endpoint),
      id
    );
  }

  public async enqueue(
    tokenId: string,
    endpoint: string,
    {
      body,
      runAt: runAtOption,
      id,
      delay,
      repeat,
      override,
      exclusive,
      retry,
    }: EnqueueJob
  ) {
    if (typeof id === "undefined") {
      id = uuid.v4();
    }

    let runAt: Date | undefined = undefined;

    if (runAtOption) {
      runAt = new Date(runAtOption);
    } else if (delay) {
      runAt = new Date(Date.now() + delay);
    }

    if (repeat?.cron) {
      runAt = cron(runAt ?? new Date(), repeat.cron);
    }

    if (typeof repeat?.times === "number" && repeat.times < 1) {
      throw new Error("repeat.times must be positive");
    }

    let schedule_type: "every" | "cron" | undefined = undefined;
    let schedule_meta: string | undefined = undefined;

    if (repeat?.cron) {
      schedule_type = "cron";
      schedule_meta = repeat.cron;
    }

    if (repeat?.every) {
      schedule_type = "every";
      schedule_meta = "" + repeat.every;
    }

    const createdJob = await this.producer.enqueue({
      queue: encodeQueueDescriptor(tokenId, endpoint),
      id,
      payload: body ?? "",
      runAt,
      exclusive,
      schedule: schedule_type
        ? {
            type: schedule_type,
            meta: schedule_meta!,
            times: repeat?.times,
          }
        : undefined,
      override,
      retry,
    });
    await this.queueRepo.add(endpoint, tokenId);

    return JobsRepo.toJobDTO(createdJob);
  }

  public async updateCron(
    tokenId: string,
    { baseUrl, crons, dryRun }: QueuesUpdateCronBody
  ) {
    const deleted: string[] = [];

    const queues = await this.queueRepo.get(tokenId);
    const queuesOnSameDeployment = queues.filter((q) => q.startsWith(baseUrl));

    if (!dryRun) {
      await Promise.all(
        crons.map(async ({ route, schedule }) => {
          await this.enqueue(tokenId, `${baseUrl}/${route}`, {
            id: "@cron",
            body: "null",
            override: true,
            repeat: { cron: schedule },
          });
        })
      );
    }

    const routesThatShouldPersist = crons.map((c) => c.route);
    await Promise.all(
      queuesOnSameDeployment.map(async (queue) => {
        const route = queue.slice(baseUrl.length + 1);
        const shouldPersist = routesThatShouldPersist.includes(route);
        if (shouldPersist) {
          return;
        }

        if (dryRun) {
          const exists = await this.findById(tokenId, queue, "@cron");
          if (exists) {
            deleted.push(queue);
          }
        } else {
          const result = await this.delete(tokenId, queue, "@cron");
          if (result === "deleted") {
            deleted.push(queue);
          }
        }
      })
    );

    return { deleted };
  }

  public onEvent(
    requesterTokenId: string,
    cb: (
      event: string,
      job: { endpoint: string; id: string; runAt?: string } | JobDTO
    ) => void
  ) {
    const activity = this.owl.createActivity(
      async (event) => {
        if (event.type === "scheduled") {
          cb(
            "scheduled",
            JobsRepo.toJobDTO(event.job as Job<"every" | "cron">)
          );
          return;
        }

        const { endpoint } = decodeQueueDescriptor(event.queue);

        switch (event.type) {
          case "acknowledged":
            cb("completed", { endpoint, id: event.id });
            break;
          case "requested":
            cb("started", { endpoint, id: event.id });
            break;
          case "invoked":
            cb("invoked", { endpoint, id: event.id });
            break;
          case "rescheduled":
            cb("rescheduled", {
              endpoint,
              id: event.id,
              runAt: event.runAt.toISOString(),
            });
            break;
          case "deleted":
            cb("deleted", { endpoint, id: event.id });
            break;
        }
      },
      {
        queue: encodeQueueDescriptor(requesterTokenId, "*"),
      }
    );

    return () => activity.close();
  }
}
