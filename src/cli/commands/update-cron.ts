import { Command } from "commander";
import { promises as fs } from "fs";
import { QuirrelClient } from "../../client";
import {
  RouteScheduleManifest,
  RouteScheduleManifestSchema,
} from "./detect-cron";
import * as config from "../../client/config";
import Table from "easy-table";

export function formatRouteScheduleMapAsTable(jobs: RouteScheduleManifest) {
  return Table.print(
    jobs.map((job) => ({
      Route: job.route,
      Schedule: job.schedule,
    }))
  );
}
export async function updateCron(
  scheduleMap: RouteScheduleManifest,
  dryRun: boolean,
  production: boolean
) {
  if (production) {
    process.env.NODE_ENV = "production";
  }

  const quirrel = new QuirrelClient({
    async handler() {},
    route: "",
  });

  const endpointsResponse = await quirrel.makeRequest("/queues/update-cron", {
    method: "PUT",
    body: JSON.stringify({
      baseUrl: config.withoutTrailingSlash(
        config.prefixWithProtocol(config.getApplicationBaseUrl())
      ),
      crons: scheduleMap,
      dryRun,
    }),
    headers: { "content-type": "application/json" },
  });

  if (endpointsResponse.status !== 200) {
    console.error("Something went wrong: " + (await endpointsResponse.text()));
    return;
  }

  if (dryRun) {
    console.error(`This was a --dry-run, so nothing was applied.`);
  } else {
    console.error(`Successfully updated jobs.`);
  }

  const { deleted } = (await endpointsResponse.json()) as { deleted: string[] };
  if (deleted.length > 0) {
    console.error(
      `These jobs are obsolete, and ${dryRun ? "would be" : "were"} removed: `
    );
    deleted.forEach((route) => console.log(route));
  }
}

export default function registerUpdateCron(program: Command) {
  program
    .command("update-cron [filename]")
    .description(
      "Updates the Quirrel API with cron jobs that have been detected using detect-cron."
    )
    .option("-d, --dry-run", "Only plan the update, don't execute.", false)
    .option("-p, --production", "Use production config.", false)
    .action(
      async (
        filename = "/dev/stdin",
        { dryRun, production }: { dryRun: boolean; production: boolean }
      ) => {
        const routeScheduleMapString = await fs.readFile(filename, "utf-8");
        const routeScheduleMap = RouteScheduleManifestSchema.parse(
          JSON.parse(routeScheduleMapString)
        );

        await updateCron(routeScheduleMap, dryRun, production);
      }
    );
}
