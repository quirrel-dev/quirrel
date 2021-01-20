import { decodeQueueDescriptor } from "../shared/queue-descriptor";
import { UsageMeter } from "../shared/usage-meter";
import fetch from "cross-fetch";
import { TokenRepo } from "../shared/token-repo";
import { sign } from "secure-webhooks";
import { Redis } from "ioredis";
import { Telemetrist } from "../shared/telemetrist";
import { createOwl } from "../shared/owl";
import type { Logger } from "../shared/logger";
import { IncidentForwarder } from "../shared/incident-forwarder";

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
  const incidentForwarder = incidentReceiver
    ? new IncidentForwarder(
        incidentReceiver.endpoint,
        incidentReceiver.passphrase
      )
    : undefined;

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

  const worker = owl.createWorker(async (job, jobMeta) => {
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

    const response = await fetch(endpoint, {
      method: "POST",
      body,
      headers,
    });

    if (response.status >= 200 && response.status < 300) {
      executionDone?.();

      telemetrist?.dispatch("dispatch_job");
    } else {
      const responseBody = await response.text();

      await incidentForwarder?.dispatch(
        {
          endpoint,
          tokenId,
          payload: job.payload,
          id: job.id,
          runAt: job.runAt,
        },
        {
          body: responseBody,
          status: response.status,
        }
      );

      logger?.executionErrored(
        { endpoint, tokenId, body: job.payload, id: job.id },
        responseBody
      );

      telemetrist?.dispatch("execution_errored");

      if (response.status === 404) {
        jobMeta.dontReschedule();
      }
    }

    await usageMeter?.record(tokenId);
  });

  async function close() {
    await worker.close();
    await redisClient.quit();
  }

  return {
    close,
  };
}
