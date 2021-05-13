import { decodeQueueDescriptor } from "../shared/queue-descriptor";
import { UsageMeter } from "../shared/usage-meter";
import fetch from "cross-fetch";
import { TokenRepo } from "../shared/token-repo";
import { asymmetric, sign, symmetric } from "secure-webhooks";
import { Redis } from "ioredis";
import { Telemetrist } from "../shared/telemetrist";
import { createOwl } from "../shared/owl";
import type { Logger } from "../shared/logger";
import { IncidentForwarder } from "../shared/incident-forwarder";

interface ExecutionError {
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
  webhookSigningPrivateKey?: string;
}

export async function createWorker({
  redisFactory,
  enableUsageMetering,
  runningInDocker,
  concurrency = 100,
  disableTelemetry,
  logger,
  incidentReceiver,
  webhookSigningPrivateKey,
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

  const tokenRepo = webhookSigningPrivateKey
    ? undefined
    : new TokenRepo(redisClient);

  let usageMeter: UsageMeter | undefined = undefined;
  if (enableUsageMetering) {
    usageMeter = new UsageMeter(redisClient);
  }

  const owl = createOwl(redisFactory);

  const worker = owl.createWorker(
    async (job, jobMeta) => {
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
          nextRepetition: jobMeta.nextExecDate,
        }),
      };

      if (tokenId) {
        const payload = body ?? "";
        if (webhookSigningPrivateKey) {
          headers["x-quirrel-signature"] = asymmetric.sign(
            payload,
            webhookSigningPrivateKey
          );
        } else {
          const token = await tokenRepo?.getById(tokenId);
          if (token) {
            headers["x-quirrel-signature"] = symmetric.sign(payload, token);
          }
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
      } else {
        const responseBody = await response.text();

        logger?.executionErrored(
          { endpoint, tokenId, body: job.payload, id: job.id },
          responseBody
        );

        if (response.status === 404) {
          jobMeta.dontReschedule();
        }

        const error: ExecutionError = {
          tokenId,
          endpoint,
          responseBody,
          responseStatus: response.status,
          toString() {
            return responseBody;
          },
        };

        throw error;
      }
    },
    async (job, _error) => {
      const {
        tokenId,
        endpoint,
        responseBody,
        responseStatus,
      } = (_error as any) as ExecutionError;

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
          status: responseStatus,
        }
      );

      await telemetrist?.dispatch("execution_errored");
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
