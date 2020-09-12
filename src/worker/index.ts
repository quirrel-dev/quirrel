import * as Queue from "bee-queue";
import { HttpJob, HTTP_JOB_QUEUE } from "../shared/http-job";
import { UsageMeter } from "../shared/usage-meter";
import axios from "axios";
import * as redis from "redis";

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

  let usageMeter: UsageMeter | undefined = undefined;
  if (enableUsageMetering) {
    // TODO: close redis client on close
    usageMeter = new UsageMeter(redis.createClient(redisOpts as any));
  }

  jobsQueue.process(async (job) => {
    const { endpoint, body, tokenId } = job.data as HttpJob;
    console.log("Sending ", body, " to ", endpoint);
    await axios.post(endpoint, body);

    if (tokenId) {
      await usageMeter?.record(tokenId);
    }
  });

  async function close() {
    await jobsQueue.close();
  }

  return {
    close,
    healthCheck: () => jobsQueue.checkHealth(),
  };
}
