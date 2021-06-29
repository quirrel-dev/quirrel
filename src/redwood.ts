import {
  QuirrelClient,
  EnqueueJobOpts,
  EnqueueJobOptions,
  Job,
  DefaultJobOptions,
  QuirrelJobHandler,
} from "./client";
import { registerDevelopmentDefaults } from "./client/config";

export { Job, EnqueueJobOpts, EnqueueJobOptions, DefaultJobOptions, QuirrelJobHandler };

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

export type Queue<Payload> = Omit<
  QuirrelClient<Payload>,
  "respondTo" | "makeRequest"
>;

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
  cronSchedule: string,
  handler: () => Promise<void>
) {
  return Queue(route, handler) as unknown;
}
