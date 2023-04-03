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
  applicationPort: 5173,
});

interface SvelteEvent {
  request: Request;
}

export type Queue<Payload> = Omit<
  QuirrelClient<Payload>,
  "respondTo" | "makeRequest"
>;

export function Queue<Payload>(
  route: string,
  handler: QuirrelJobHandler<Payload>,
  options?: QuirrelOptions<Payload>
): Queue<Payload> {
  const quirrel = new QuirrelClient<Payload>({
    options,
    handler,
    route,
  });

  async function svelteHandler({ request }: SvelteEvent): Promise<Response> {
    const { body, headers, status } = await quirrel.respondTo(
      await request.text(),
      Object.fromEntries([...request.headers.entries()])
    );

    return new Response(body, { headers, status });
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
