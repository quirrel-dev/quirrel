import connect from "connect";
import {
  DefaultJobOptions,
  QuirrelClient,
  QuirrelJobHandler,
  EnqueueJobOpts,
  Job,
} from "./client";
import bodyParser from "body-parser";

export { DefaultJobOptions, QuirrelJobHandler, EnqueueJobOpts, Job };

export type Queue<Payload> = connect.Server &
  Omit<QuirrelClient<Payload>, "respondTo">;

declare module "connect" {
  export interface IncomingMessage {
    body: string;
  }
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

  const server = connect() as Queue<Payload>;

  server.use(bodyParser.text());
  server.use(async (req, res) => {
    const { body, status, headers } = await quirrel.respondTo(
      req.body,
      req.headers["x-quirrel-signature"] as string
    );

    res.statusCode = status;
    for (const [header, value] of Object.entries(headers)) {
      res.setHeader(header, value);
    }
    res.write(body);
  });

  server.enqueue = (payload, opts) => quirrel.enqueue(payload, opts);
  server.get = () => quirrel.get();
  server.delete = (id) => quirrel.delete(id);
  server.getById = (id) => quirrel.getById(id);
  server.invoke = (id) => quirrel.invoke(id);

  return server;
}

export function CronJob(route: string, handler: QuirrelJobHandler<void>) {
  return Queue(route, handler) as unknown;
}
