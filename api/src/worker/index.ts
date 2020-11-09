import { decodeQueueDescriptor } from "../shared/http-job";
import { UsageMeter } from "../shared/usage-meter";
import axios from "axios";
import { TokenRepo } from "../shared/token-repo";
import { sign } from "secure-webhooks";
import { Redis } from "ioredis";
import { Telemetrist } from "../shared/telemetrist";
import { createOwl } from "../shared/owl";
import type { Logger } from "../shared/logger";

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
  redisFactory: () => Redis;
  enableUsageMetering?: boolean;
  runningInDocker?: boolean;
  concurrency?: number;
  disableTelemetry?: boolean;
  logger?: Logger;
}

export async function createWorker({
  redisFactory,
  enableUsageMetering,
  runningInDocker,
  concurrency = 100,
  disableTelemetry,
  logger,
}: QuirrelWorkerConfig) {
  const redisClient = redisFactory();
  const telemetrist = disableTelemetry
    ? undefined
    : new Telemetrist(runningInDocker ?? false);

  const tokenRepo = new TokenRepo(redisClient);

  let usageMeter: UsageMeter | undefined = undefined;
  if (enableUsageMetering) {
    usageMeter = new UsageMeter(redisClient);
  }

  const owl = createOwl(redisFactory);

  const worker = owl.createWorker(
    async (job) => {
      let { tokenId, endpoint } = decodeQueueDescriptor(job.queue);
      const body = job.payload;

      const executionDone = logger?.startingExecution({
        tokenId,
        endpoint,
        body,
        id: job.id,
      });

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

      executionDone?.();

      telemetrist?.dispatch("dispatch_job");
    },
    (job, error) => {
      const { endpoint, tokenId } = decodeQueueDescriptor(job.queue);
      logger?.executionErrored(
        { endpoint, tokenId, body: job.payload, id: job.id },
        error
      );
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
