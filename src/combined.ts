import {
  DefaultJobOptions,
  QuirrelClient,
  QuirrelJobHandler,
  EnqueueJobOptions,
  Job,
} from "./client";
import type { IncomingHttpHeaders } from "http";

export { DefaultJobOptions, QuirrelJobHandler, EnqueueJobOptions, Job };

export type Queue<Payload> = Omit<
  QuirrelClient<Payload>,
  "respondTo" | "makeRequest"
>;

interface NextApiRequest {
  body: any;
  headers: IncomingHttpHeaders;
}

interface NextApiResponse {
  setHeader(key: string, value: string): void;
  status(code: number): void;
  send(body: string): void;
}

interface LambdaEvent {
  body: string;
  headers: Record<string, string>;
}

interface LambdaResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

export function Queue<Payload>(
  route: string,
  handler: QuirrelJobHandler<Payload>,
  defaultJobOptions?: DefaultJobOptions
): Queue<Payload> {
  const quirrel = new QuirrelClient({
    route,
    handler,
    defaultJobOptions,
  });

  const integrations: Record<string, (args: any[]) => null | (() => any)> = {
    next(args) {
      if (args.length !== 2) {
        return null;
      }

      const [_req, _res] = args;
      if (
        !_req.body ||
        !_req.headers ||
        typeof _res.status !== "function" ||
        typeof _res.setHeader !== "function"
      ) {
        return null;
      }

      const req = _req as NextApiRequest;
      const res = _res as NextApiResponse;

      return async () => {
        const response = await quirrel.respondTo(req.body, req.headers);
        res.status(response.status);
        for (const [header, value] of Object.entries(response.headers)) {
          res.setHeader(header, value);
        }
        res.send(response.body);
      };
    },
    lambda(args) {
      if (args.length < 2) {
        return null;
      }

      const [_event, _context] = args;
      if (!_event.body || !_event.headers || !_context.clientContext) {
        return null;
      }

      const event = _event as LambdaEvent;

      return async (): Promise<LambdaResponse> => {
        const { body, headers, status } = await quirrel.respondTo(
          event.body,
          event.headers
        );
        return {
          statusCode: status,
          body,
          headers,
        };
      };
    },
  };

  function handleByIntegration(args: any) {
    for (const [name, integration] of Object.entries(integrations)) {
      const handler = integration(args);
      if (handler) {
        return handler();
      }
    }
    throw new Error("no integration found!");
  }

  const middleware: Queue<Payload> = function middleware(...args: any): any {
    return handleByIntegration(args);
  };

  middleware.enqueue = (payload, options) => quirrel.enqueue(payload, options);
  middleware.enqueueMany = (jobs) => quirrel.enqueueMany(jobs);
  middleware.get = () => quirrel.get();
  middleware.delete = (id) => quirrel.delete(id);
  middleware.getById = (id) => quirrel.getById(id);
  middleware.invoke = (id) => quirrel.invoke(id);

  return middleware;
}

export function CronJob(
  route: string,
  cronSchedule: NonNullable<NonNullable<EnqueueJobOptions["repeat"]>["cron"]>,
  handler: () => Promise<void>
) {
  return Queue(route, handler) as unknown;
}
