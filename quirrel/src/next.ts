import type { NextApiRequest, NextApiResponse } from "next";
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
  applicationBaseUrl: "http://localhost:3000",
});

export type Queue<Payload> = Omit<QuirrelClient<Payload>, "respondTo">;

export function Queue<Payload>(
  route: string,
  handler: (payload: Payload) => Promise<void>,
  defaultJobOptions?: DefaultJobOptions
): Queue<Payload> {
  if (!route.startsWith("api/")) {
    route = "api/" + route;
  }

  const quirrel = new QuirrelClient<Payload>({
    defaultJobOptions,
    handler,
    route,
  });

  async function nextApiHandler(req: NextApiRequest, res: NextApiResponse) {
    const response = await quirrel.respondTo(
      req.body,
      req.headers["x-quirrel-signature"] as string
    );
    res.status(response.status);
    for (const [header, value] of Object.entries(response.headers)) {
      res.setHeader(header, value);
    }
    res.send(response.body);
  }

  nextApiHandler.enqueue = (payload: Payload, opts: EnqueueJobOpts) =>
    quirrel.enqueue(payload, opts);

  nextApiHandler.delete = (jobId: string) => quirrel.delete(jobId);

  nextApiHandler.invoke = (jobId: string) => quirrel.invoke(jobId);

  nextApiHandler.get = () => quirrel.get();

  nextApiHandler.getById = (jobId: string) => quirrel.getById(jobId);

  return nextApiHandler;
}
