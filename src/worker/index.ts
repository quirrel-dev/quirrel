import * as Queue from "bee-queue";
import { HttpJob, HTTP_JOB_QUEUE } from "../shared/http-job";
import { UsageMeter } from "../shared/usage-meter";
import axios from "axios";
import * as redis from "redis";
import { TokenRepo } from "../shared/token-repo";
import { sign } from "secure-webhooks";

export interface QuirrelWorkerConfig {
  redis?: redis.ClientOpts | string;
  enableUsageMetering?: boolean;
}

export async function createWorker({
  redis: redisOpts,
  enableUsageMetering,
}: QuirrelWorkerConfig) {
  const jobsQueue = new Queue(HTTP_JOB_QUEUE, {
    redis: redisOpts as any,
    isWorker: true,
  });

  const redisClient = redis.createClient(redisOpts as any);

  const tokenRepo = new TokenRepo(redisClient);

  let usageMeter: UsageMeter | undefined = undefined;
  if (enableUsageMetering) {
    usageMeter = new UsageMeter(redisClient);
  }

  jobsQueue.process(async (job) => {
    const { endpoint, body, tokenId } = job.data as HttpJob;

    console.log("Sending ", body, " to ", endpoint);

    const input = JSON.stringify(body);

    const headers: Record<string, string> = {
      "Content-Type": "text/plain",
    };

    if (tokenId) {
      const token = await tokenRepo.getById(tokenId);
      if (token) {
        const signature = sign(input, token);
        headers["x-quirrel-signature"] = signature;
      }
    }

    await axios.post(endpoint, input, {
      headers,
    });

    if (tokenId) {
      await usageMeter?.record(tokenId);
    }
  });

  async function close() {
    await jobsQueue.close();
    redisClient.quit();
  }

  return {
    close,
    healthCheck: () => jobsQueue.checkHealth(),
  };
}
