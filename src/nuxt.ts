import { EnqueueJobOptions, QuirrelClient, QuirrelOptions } from "./client/index.js";
import { registerDevelopmentDefaults } from "./client/config.js";
import * as connect from "./connect.js";

registerDevelopmentDefaults({
  applicationBaseUrl: "http://localhost:3000",
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

export * from "./connect.js";
