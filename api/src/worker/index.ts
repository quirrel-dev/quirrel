import { Worker } from "@quirrel/bullmq";
import {
  decodeQueueDescriptor,
  HttpJob,
  HTTP_JOB_QUEUE,
} from "../shared/http-job";
import { UsageMeter } from "../shared/usage-meter";
import axios from "axios";
import { TokenRepo } from "../shared/token-repo";
import { sign } from "secure-webhooks";
import * as Redis from "ioredis";
import { BaseJobsRepo } from "../scheduler/jobs-repo";

export function replaceLocalhostWithDockerHost(url: string): string {
  if (url.startsWith("http://localhost")) {
    return url.replace("http://localhost", "http://host.docker.internal");
  }

  if (url.startsWith("https://localhost")) {
    return url.replace("https://localhost", "https://host.docker.internal");
  }

  return url;
}

export interface QuirrelWorkerConfig {
  redis?: Redis.RedisOptions | string;
  enableUsageMetering?: boolean;
  runningInDocker?: boolean;
  concurrency?: number;
}

export async function createWorker({
  redis: redisOpts,
  enableUsageMetering,
  runningInDocker,
  concurrency = 100,
}: QuirrelWorkerConfig) {
  const redisClient = new Redis(redisOpts as any);

  const tokenRepo = new TokenRepo(redisClient);

  let usageMeter: UsageMeter | undefined = undefined;
  if (enableUsageMetering) {
    usageMeter = new UsageMeter(redisClient);
  }

  const jobsRepo = new BaseJobsRepo(redisClient);

  const worker = new Worker<HttpJob>(
    HTTP_JOB_QUEUE,
    async (job) => {
      let { tokenId, endpoint } = decodeQueueDescriptor(job.name);
      let { body } = job.data as HttpJob;

      console.log("Sending ", body, " to ", endpoint);

      const headers: Record<string, string> = {
        "Content-Type": "text/plain",
      };

      if (tokenId) {
        const token = await tokenRepo.getById(tokenId);
        if (token) {
          const signature = sign(body ?? "", token);
          headers["x-quirrel-signature"] = signature;
        }
      }

      if (runningInDocker) {
        endpoint = replaceLocalhostWithDockerHost(endpoint);
      }

      await axios.post(endpoint, body, {
        headers,
      });

      await usageMeter?.record(tokenId);

      process.nextTick(() => {
        jobsRepo.reenqueue(job);
      });
    },
    {
      connection: redisClient,
      concurrency,
    }
  );

  async function close() {
    await worker.close();
    await redisClient.quit();
    await jobsRepo.close();
  }

  return {
    close,
  };
}
