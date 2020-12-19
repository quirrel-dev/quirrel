import {
  QuirrelClient,
  EnqueueJobOpts,
  Job,
  DefaultJobOptions,
} from "./client";

export { Job, EnqueueJobOpts, DefaultJobOptions };

interface RedwoodEvent {
  body: string;
  headers: Record<string, string>;
}

interface RedwoodResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export interface Queue<Payload>
  extends Omit<QuirrelClient<Payload>, "respondTo"> {
  handler(event: RedwoodEvent): Promise<RedwoodResponse>;
}

export function Queue<Payload>(
  route: string,
  handler: (payload: Payload) => Promise<void>,
  defaultJobOptions?: DefaultJobOptions
): Queue<Payload> {
  const quirrel = new QuirrelClient({
    handler,
    route,
    defaultJobOptions,
  });

  return {
    delete: (jobId) => quirrel.delete(jobId),
    invoke: (jobId) => quirrel.invoke(jobId),
    get: () => quirrel.get(),
    getById: (jobId) => quirrel.getById(jobId),
    enqueue: (payload, meta) => quirrel.enqueue(payload, meta),
    async handler(event) {
      const { body, headers, status } = await quirrel.respondTo(
        event.body,
        event.headers["x-quirrel-signature"]
      );
      return {
        statusCode: status,
        body,
        headers,
      };
    },
  };
}
