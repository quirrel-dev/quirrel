import {
  QuirrelClient,
  EnqueueJobOptions,
  Job,
  DefaultJobOptions,
  QuirrelJobHandler,
  QuirrelOptions,
} from "./client";
import { registerDevelopmentDefaults } from "./client/config";

export { Job, EnqueueJobOptions, DefaultJobOptions, QuirrelJobHandler };

registerDevelopmentDefaults({
  applicationBaseUrl: "localhost:3000",
});

interface SvelteRequest {
  body: string;
  headers: Record<string, string>;
}

interface SvelteResponse {
  status: number;
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

  async function svelteHandler(
    request: SvelteRequest
  ): Promise<SvelteResponse> {
    const { body, headers, status } = await quirrel.respondTo(
      request.body,
      request.headers
    );
    return {
      status,
      body,
      headers,
    };
  }

  svelteHandler.enqueue = (payload: Payload, options: EnqueueJobOptions) =>
    quirrel.enqueue(payload, options);

  svelteHandler.enqueueMany = (
    jobs: { payload: Payload; options?: EnqueueJobOptions }[]
  ) => quirrel.enqueueMany(jobs);

  svelteHandler.delete = (jobId: string) => quirrel.delete(jobId);

  svelteHandler.invoke = (jobId: string) => quirrel.invoke(jobId);

  svelteHandler.get = () => quirrel.get();

  svelteHandler.getById = (jobId: string) => quirrel.getById(jobId);

  return svelteHandler;
}

export function CronJob(
  route: string,
  cronSchedule: NonNullable<NonNullable<EnqueueJobOptions["repeat"]>["cron"]>,
  handler: () => Promise<void>,
  options?: QuirrelOptions
) {
  return Queue(route, handler, options) as unknown;
}
