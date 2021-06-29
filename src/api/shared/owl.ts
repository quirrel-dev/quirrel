import Owl from "@quirrel/owl";
import { Redis } from "ioredis";
import { cron, every } from "../../shared/repeat";
import { IncidentForwarder } from "./incident-forwarder";
import { decodeQueueDescriptor } from "./queue-descriptor";
import { ExecutionError } from "../worker";
import { Telemetrist } from "./telemetrist";
import { Logger } from "./logger";

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

  const owl = new Owl({
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
