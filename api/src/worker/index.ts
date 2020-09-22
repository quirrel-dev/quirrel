import { Worker } from "@quirrel/bullmq";
import {
  decodeJobDescriptor,
  HttpJob,
  HTTP_JOB_QUEUE,
} from "../shared/http-job";
import { UsageMeter } from "../shared/usage-meter";
import axios from "axios";
import { TokenRepo } from "../shared/token-repo";
import { sign } from "secure-webhooks";
import * as Redis from "ioredis";

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
}

export async function createWorker({
  redis: redisOpts,
  enableUsageMetering,
  runningInDocker,
}: QuirrelWorkerConfig) {
  const redisClient = new Redis(redisOpts as any);

  const tokenRepo = new TokenRepo(redisClient);

  let usageMeter: UsageMeter | undefined = undefined;
  if (enableUsageMetering) {
    usageMeter = new UsageMeter(redisClient);
  }

  const worker = new Worker<HttpJob>(
    HTTP_JOB_QUEUE,
    async (job) => {
      let { tokenId, endpoint } = decodeJobDescriptor(job.id!);
      let { body } = job.data as HttpJob;

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

      if (runningInDocker) {
        endpoint = replaceLocalhostWithDockerHost(endpoint);
      }

      await axios.post(endpoint, input, {
        headers,
      });

      await usageMeter?.record(tokenId);
    },
    {
      connection: redisClient,
    }
  );

  async function close() {
    await worker.close();
    await redisClient.quit();
  }

  return {
    close,
  };
}
