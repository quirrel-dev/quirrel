import {
  QuirrelClient,
  EnqueueJobOpts,
  Job,
  DefaultJobOptions,
  QuirrelJobHandler,
} from "./client";
import { registerDevelopmentDefaults } from "./client/config";

export { Job, EnqueueJobOpts, DefaultJobOptions, QuirrelJobHandler };

registerDevelopmentDefaults({
  applicationBaseUrl: "http://localhost:8911",
});

interface RedwoodEvent {
  body: string;
  headers: Record<string, string>;
}

interface RedwoodResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export type Queue<Payload> = Omit<QuirrelClient<Payload>, "respondTo">;

export function Queue<Payload>(
  route: string,
  handler: QuirrelJobHandler<Payload>,
  defaultJobOptions?: DefaultJobOptions
): Queue<Payload> {
  const quirrel = new QuirrelClient<Payload>({
    defaultJobOptions,
    handler,
    route,
  });

  async function redwoodHandler(event: RedwoodEvent): Promise<RedwoodResponse> {
    const { body, headers, status } = await quirrel.respondTo(
      event.body,
      event.headers["x-quirrel-signature"]
    );
    return {
      statusCode: status,
      body,
      headers,
    };
  }

  redwoodHandler.enqueue = (payload: Payload, opts: EnqueueJobOpts) =>
    quirrel.enqueue(payload, opts);

  redwoodHandler.delete = (jobId: string) => quirrel.delete(jobId);

  redwoodHandler.invoke = (jobId: string) => quirrel.invoke(jobId);

  redwoodHandler.get = () => quirrel.get();

  redwoodHandler.getById = (jobId: string) => quirrel.getById(jobId);

  return redwoodHandler;
}

export function CronJob(
  route: string,
  cronSchedule: string,
  handler: QuirrelJobHandler<void>
) {
  return Queue(route, handler) as unknown;
}
