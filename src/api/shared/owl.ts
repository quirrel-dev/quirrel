import Owl from "@quirrel/owl";
import { Redis } from "ioredis";
import { cron, every } from "../../shared/repeat.js";
import { IncidentForwarder } from "./incident-forwarder.js";
import { decodeQueueDescriptor } from "./queue-descriptor.js";
import { ExecutionError } from "../worker/index.js";
import { Telemetrist } from "./telemetrist.js";
import { Logger } from "./logger.js";

export async function createOwl(
  redisFactory: () => Redis,
  logger?: Logger,
  incidentReceiver?: { endpoint: string; passphrase: string },
  telemetrist?: Telemetrist
) {
  const incidentForwarder = incidentReceiver
    ? new IncidentForwarder(
        incidentReceiver.endpoint,
        incidentReceiver.passphrase
      )
    : undefined;

  const owl = new Owl.default({
    redisFactory: redisFactory as any,
    scheduleMap: {
      every,
      cron,
    },
    logger: logger?.log?.child({ module: "owl" }),
    async onError(ack, job, error: ExecutionError) {
      let { tokenId, endpoint } = decodeQueueDescriptor(job.queue);

      await incidentForwarder?.dispatch(
        {
          endpoint,
          tokenId,
          payload: job.payload,
          id: job.id,
          runAt: job.runAt,
        },
        {
          body: error.responseBody,
          status: error.responseStatus,
        }
      );

      await telemetrist?.dispatch("execution_errored");
    },
  });

  if (!process.env.SKIP_OWL_MIGRATIONS) {
    await owl.runMigrations();
  }

  return owl;
}
