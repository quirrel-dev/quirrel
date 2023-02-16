import { EnqueueJobOptions, QuirrelClient, QuirrelOptions } from "./client";
import { registerDevelopmentDefaults } from "./client/config";
import * as connect from "./connect";

registerDevelopmentDefaults({
  applicationPort: 3000,
});

export function Queue<Payload>(
  path: string,
  handler: connect.QuirrelJobHandler<Payload>,
  options?: QuirrelOptions,
): Omit<QuirrelClient<Payload>, "respondTo" | "makeRequest"> {
  const client = connect.Queue(path, handler, options);

  (client as any).path = path;
  (client as any).handler = client.handle;

  return client;
}

export function CronJob(
  route: string,
  cronSchedule: NonNullable<NonNullable<EnqueueJobOptions["repeat"]>["cron"]>,
  handler: () => Promise<void>,
  options?: QuirrelOptions
) {
  return Queue(route, handler, options) as unknown;
}

export * from "./connect";
