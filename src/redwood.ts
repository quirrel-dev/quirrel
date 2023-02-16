import {
  QuirrelClient,
  EnqueueJobOpts,
  EnqueueJobOptions,
  Job,
  DefaultJobOptions,
  QuirrelJobHandler,
  QuirrelOptions,
} from "./client";
import { registerDevelopmentDefaults } from "./client/config";

export {
  Job,
  EnqueueJobOpts,
  EnqueueJobOptions,
  DefaultJobOptions,
  QuirrelJobHandler,
};

registerDevelopmentDefaults({
  applicationPort: 8911,
});

function decodeBase64(v: string): string {
  return Buffer.from(v, "base64").toString("utf8");
}

interface RedwoodEvent {
  body: string;
  headers: Record<string, string>;
  isBase64Encoded: boolean;
}

interface RedwoodResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export type Queue<Payload> = Omit<
  QuirrelClient<Payload>,
  "respondTo" | "makeRequest"
>;

export function Queue<Payload>(
  route: string,
  handler: QuirrelJobHandler<Payload>,
  options?: QuirrelOptions<Payload>,
): Queue<Payload> {
  const quirrel = new QuirrelClient<Payload>({
    options,
    handler,
    route,
  });

  async function redwoodHandler(event: RedwoodEvent): Promise<RedwoodResponse> {
    const { body, headers, status } = await quirrel.respondTo(
      event.isBase64Encoded ? decodeBase64(event.body) : event.body,
      event.headers
    );
    return {
      statusCode: status,
      body,
      headers,
    };
  }

  redwoodHandler.enqueue = (payload: Payload, options: EnqueueJobOptions) =>
    quirrel.enqueue(payload, options);

  redwoodHandler.enqueueMany = (
    jobs: { payload: Payload; options?: EnqueueJobOptions }[]
  ) => quirrel.enqueueMany(jobs);

  redwoodHandler.delete = (jobId: string) => quirrel.delete(jobId);

  redwoodHandler.invoke = (jobId: string) => quirrel.invoke(jobId);

  redwoodHandler.get = () => quirrel.get();

  redwoodHandler.getById = (jobId: string) => quirrel.getById(jobId);

  return redwoodHandler;
}

export function CronJob(
  route: string,
  cronSchedule: NonNullable<NonNullable<EnqueueJobOptions["repeat"]>["cron"]>,
  handler: () => Promise<void>,
  options?: QuirrelOptions
) {
  return Queue(route, handler, options) as unknown;
}
