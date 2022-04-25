import { Command } from "commander";
import { promises as fs } from "fs";
import { QuirrelClient } from "../../client";
import {
  RouteScheduleManifest,
  RouteScheduleManifestSchema,
} from "./detect-cron";
import * as config from "../../client/config";
import Table from "easy-table";

async function clearOldInstance() {
  const client = new QuirrelClient({
    async handler() {},
    route: "",
    config: {
      quirrelBaseUrl: config.getOldQuirrelBaseUrl(),
      token: config.getOldQuirrelToken(),
    },
  });
  const endpointsResponse = await client.makeRequest("/queues/update-cron", {
    method: "PUT",
    body: JSON.stringify({
      baseUrl: config.withoutTrailingSlash(
        config.prefixWithProtocol(config.getApplicationBaseUrl())
      ),
      crons: [],
    }),
    headers: { "content-type": "application/json" },
  });
  if (endpointsResponse.status !== 200) {
    throw new Error(
      "Failed to clear old instance: " + (await endpointsResponse.text())
    );
  }
  console.log("Cleared old instance.");
}

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

  console.log("Jobs:\n");

  console.log(formatRouteScheduleMapAsTable(scheduleMap));

  console.log("Updating server ... ");

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

  if (!dryRun && config.getOldQuirrelBaseUrl()) {
    await clearOldInstance();
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
