import { QuirrelClient } from "./client";
import { registerDevelopmentDefaults } from "./client/config";
import * as connect from "./connect";

registerDevelopmentDefaults({
  applicationBaseUrl: "http://localhost:3000",
});

export function Queue<Payload>(
  path: string,
  handler: connect.QuirrelJobHandler<Payload>,
  defaultJobOptions?: connect.DefaultJobOptions
): Omit<QuirrelClient<Payload>, "respondTo"> {
  const client = connect.Queue(path, handler, defaultJobOptions);

  (client as any).path = path;
  (client as any).handler = client.handle;

  return client;
}

export function CronJob(
  route: string,
  cronSchedule: string,
  handler: connect.QuirrelJobHandler<void>
) {
  return Queue(route, handler) as unknown;
}

export * from "./connect";
