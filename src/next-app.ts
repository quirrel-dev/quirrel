import {
  QuirrelClient,
  EnqueueJobOptions,
  Job,
  DefaultJobOptions,
  QuirrelJobHandler,
  QuirrelOptions,
} from "./client";
import { registerDevelopmentDefaults } from "./client/config";

type NextApiHandler = (req: Request) => Response | Promise<Response>;

export {
  Job,
  EnqueueJobOptions,
  DefaultJobOptions,
  QuirrelJobHandler,
};

registerDevelopmentDefaults({
  applicationPort: 3000,
});

export type Queue<Payload> = Omit<
  QuirrelClient<Payload>,
  "respondTo" | "makeRequest"
>;

/**
 * @example // usage in route handler file: api/queues/sample
 * export const sampleQueue = Queue(
 *   "/api/queues/sample",
 *   (payload) => {
 *      ...logic goes here
 *   }
 * );
 * 
 * export const POST = sampleQueue;
 */
export function Queue<Payload>(
  route: string,
  handler: QuirrelJobHandler<Payload>,
  options?: QuirrelOptions
): Queue<Payload> & NextApiHandler {
  const quirrel = new QuirrelClient<Payload>({
    options,
    handler,
    route,
  });

  async function nextApiHandler(req: Request): Promise<Response> {
    const { body, headers, status } = await quirrel.respondTo(
      await req.text(),
      Object.fromEntries([...req.headers.entries()])
    );

    return new Response(body, {
      headers,
      status,
    });
  }

  nextApiHandler.enqueue = (payload: Payload, options: EnqueueJobOptions) =>
    quirrel.enqueue(payload, options);

  nextApiHandler.enqueueMany = (
    jobs: { payload: Payload; options?: EnqueueJobOptions }[]
  ) => quirrel.enqueueMany(jobs);

  nextApiHandler.delete = (jobId: string) => quirrel.delete(jobId);

  nextApiHandler.invoke = (jobId: string) => quirrel.invoke(jobId);

  nextApiHandler.get = () => quirrel.get();

  nextApiHandler.getById = (jobId: string) => quirrel.getById(jobId);

  return nextApiHandler;
}


/**
 * @example // usage in route handler file: api/cronjobs/sample
 * const sampleCron = CronJob(
 *   "/api/cronjobs/sample",
 *   "0 0 * * 1"
 *   (payload) => {
 *      ...logic goes here
 *   }
 * );
 * 
 * export const POST = sampleCron;
 */
export function CronJob(
  route: string,
  cronSchedule: NonNullable<NonNullable<EnqueueJobOptions["repeat"]>["cron"]>,
  handler: () => Promise<void>,
  options?: QuirrelOptions
) {
  return Queue(route, handler, options) as unknown;
}
