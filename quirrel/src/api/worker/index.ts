import { decodeQueueDescriptor } from "../shared/queue-descriptor";
import { UsageMeter } from "../shared/usage-meter";
import fetch from "cross-fetch";
import { TokenRepo } from "../shared/token-repo";
import { sign } from "secure-webhooks";
import { Redis } from "ioredis";
import { Telemetrist } from "../shared/telemetrist";
import { createOwl } from "../shared/owl";
import type { Logger } from "../shared/logger";

export interface ExecutionError {
  toString(): string;
  endpoint: string;
  tokenId: string;
  responseBody: string;
  responseStatus: number;
}

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
  incidentReceiver?: { endpoint: string; passphrase: string };
}

export async function createWorker({
  redisFactory,
  enableUsageMetering,
  runningInDocker,
  concurrency = 100,
  disableTelemetry,
  logger,
  incidentReceiver,
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

  const owl = await createOwl(redisFactory, incidentReceiver, telemetrist);

  const worker = await owl.createWorker(async (job, ack) => {
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
      "x-quirrel-meta": JSON.stringify({
        id: job.id,
        count: job.count,
        exclusive: job.exclusive,
        retry: job.retry,
        nextRepetition: ack.nextExecutionDate,
      }),
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

    const [response] = await Promise.all([
      fetch(endpoint, {
        method: "POST",
        body,
        headers,
      }),
      usageMeter?.record(tokenId),
    ]);

    if (response.status >= 200 && response.status < 300) {
      executionDone?.();

      telemetrist?.dispatch("dispatch_job");

      await worker.acknowledger.acknowledge(ack);
    } else {
      const responseBody = await response.text();

      const error: ExecutionError = {
        tokenId,
        endpoint,
        responseBody,
        responseStatus: response.status,
        toString() {
          return responseBody;
        },
      };

      await worker.acknowledger.reportFailure(ack, job, error, {
        dontReschedule: response.status === 404,
      });
    }
  });

  async function close() {
    await worker.close();
    await redisClient.quit();
  }

  return {
    close,
  };
}
