import { decodeQueueDescriptor, HttpJob } from "../shared/http-job";
import { UsageMeter } from "../shared/usage-meter";
import axios from "axios";
import { TokenRepo } from "../shared/token-repo";
import { sign } from "secure-webhooks";
import * as Redis from "ioredis";
import { Telemetrist } from "../shared/telemetrist";
import { createOwl } from "../shared/owl";

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
  disableTelemetry?: boolean;
}

export async function createWorker({
  redis: redisOpts,
  enableUsageMetering,
  runningInDocker,
  concurrency = 100,
  disableTelemetry,
}: QuirrelWorkerConfig) {
  const redisClient = new Redis(redisOpts as any);
  const telemetrist = disableTelemetry
    ? undefined
    : new Telemetrist(runningInDocker ?? false);

  const tokenRepo = new TokenRepo(redisClient);

  let usageMeter: UsageMeter | undefined = undefined;
  if (enableUsageMetering) {
    usageMeter = new UsageMeter(redisClient);
  }

  const owl = createOwl(() => new Redis(redisOpts as any));

  const worker = owl.createWorker(
    async (job) => {
      let { tokenId, endpoint } = decodeQueueDescriptor(job.queue);
      const body = job.payload;

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

      telemetrist?.dispatch("dispatch_job");
    },
    (job, error) => {
      console.error(job, error);
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
