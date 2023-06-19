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
  applicationPort: 3000,
});

/**
 * Since Nextjs app router expects you to export a named function for each route method,
 * we are returning the queue client and the POST function to pass over as an export of your route.ts.
 * see: https://nextjs.org/docs/app/building-your-application/routing/router-handlers#supported-http-methods
 *
 * @example // usage in route handler file: api/queues/sample
 * export const { POST, queue: sampleQueue } = Queue(
 *  "/api/queues/sample",
 *  (payload) => {
 *      ...logic goes here
 *  });
 *
 * await sampleQueue.enqueue({ jobData });
 */
export function Queue<Payload>(
  route: string,
  handler: QuirrelJobHandler<Payload>,
  options?: QuirrelOptions<Payload>
) {
  const queue = new QuirrelClient({
    route,
    handler,
    options,
  });

  async function POST(req: Request) {
    const { body, headers, status } = await queue.respondTo(
      await req.text(),
      Object.fromEntries([...req.headers.entries()])
    );
    return new Response(body, { headers, status });
  }

  return { POST, queue };
}

/**
 * Since Nextjs app router expects you to export a named function for each route method,
 * we are returning the queue client and the POST function to pass over as an export of your route.ts.
 * see: https://nextjs.org/docs/app/building-your-application/routing/router-handlers#supported-http-methods
 *
 * @example // usage in route handler file: api/queues/sample
 * export const { POST } = CronJob(
 *  "/api/queues/sample",
 *  "0 0 * * 1"
 *  (payload) => {
 *      ...logic goes here
 * });
 */
export function CronJob<Payload>(
  route: string,
  cronSchedule: NonNullable<NonNullable<EnqueueJobOptions["repeat"]>["cron"]>,
  handler: QuirrelJobHandler<Payload>,
  options?: QuirrelOptions<Payload>
) {
  return Queue(route, handler, options);
}