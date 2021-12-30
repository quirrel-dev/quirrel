import {
  QuirrelClient,
  EnqueueJobOpts,
  EnqueueJobOptions,
  Job,
  DefaultJobOptions,
  QuirrelJobHandler,
} from "./client";
import { registerDevelopmentDefaults } from "./client/config";

type DataFunctionArgs = {
  request: Request;
}

type ActionFunction = (args: DataFunctionArgs) => Promise<Response> | Response;

export {
  Job,
  EnqueueJobOpts,
  EnqueueJobOptions,
  DefaultJobOptions,
  QuirrelJobHandler,
};

registerDevelopmentDefaults({
  applicationBaseUrl: "http://localhost:3000",
});

export type Queue<Payload> = Omit<
  QuirrelClient<Payload>,
  "respondTo" | "makeRequest"
>;

export function Queue<Payload>(
  route: string,
  handler: QuirrelJobHandler<Payload>,
  defaultJobOptions?: DefaultJobOptions,
): ActionFunction & Queue<Payload> {
  const quirrel = new QuirrelClient<Payload>({
    defaultJobOptions,
    handler,
    route,
  });

  async function action({ request }: DataFunctionArgs) {
    const body = await request.text();
    const response = await quirrel.respondTo(body, Object.fromEntries(request.headers.entries()));
    return new Response(response.body, {
      headers: response.headers,
      status: response.status,
    });
  }

  action.enqueue = (payload: Payload, options: EnqueueJobOptions) => quirrel.enqueue(payload, options);

  action.enqueueMany = (jobs: { payload: Payload; options?: EnqueueJobOptions }[]) => quirrel.enqueueMany(jobs);

  action.delete = (jobId: string) => quirrel.delete(jobId);

  action.invoke = (jobId: string) => quirrel.invoke(jobId);

  action.get = () => quirrel.get();

  action.getById = (jobId: string) => quirrel.getById(jobId);

  return action;
}

export function CronJob(
  route: string,
  cronSchedule: NonNullable<NonNullable<EnqueueJobOptions["repeat"]>["cron"]>,
  handler: () => Promise<void>,
) {
  return Queue(route, handler) as unknown;
}
