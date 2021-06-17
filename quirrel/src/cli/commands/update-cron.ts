import { Command } from "commander";
import { promises as fs } from "fs";
import { QuirrelClient } from "../../client";
import { JobDTO } from "../../client/job";
import * as z from "zod";
import {
  RouteScheduleManifest,
  RouteScheduleManifestSchema,
} from "./detect-cron";
import { getApplicationBaseUrl } from "../../client/config";
import Table from "easy-table";

export function formatRouteScheduleMapAsTable(jobs: RouteScheduleManifest) {
  return Table.print(
    jobs.map((job) => ({
      Route: job.route,
      Schedule: job.schedule,
    }))
  );
}

async function getOldJobs() {
  const quirrel = new QuirrelClient({
    async handler() {},
    route: "",
  });

  const endpointsResponse = await quirrel.makeRequest("/queues/");
  const endpointsResult = z
    .array(z.string())
    .safeParse(await endpointsResponse.json());
  const endpoints = endpointsResult.success ? endpointsResult.data : [];

  const jobs: JobDTO[] = [];

  await Promise.all(
    endpoints.map(async (endpoint) => {
      const jobRes = await quirrel.makeRequest(
        `/queues/${encodeURIComponent(endpoint)}/${encodeURIComponent("@cron")}`
      );

      if (jobRes.status !== 200) {
        return;
      }

      jobs.push(await jobRes.json());
    })
  );

  return jobs;
}

function computeObsoleteJobs(
  oldJobs: JobDTO[],
  newJobs: RouteScheduleManifest
): RouteScheduleManifest {
  const applicationBaseUrl = getApplicationBaseUrl();

  const oldJobsAsDetected = oldJobs.map((j) => ({
    route: j.endpoint.slice(applicationBaseUrl.length + 1),
    schedule:
      j.repeat?.cron ??
      "No cron schedule found. This was most likely updated manually.",
  }));

  return oldJobsAsDetected.filter(
    (oldJob) => !newJobs.some((newJob) => newJob.route === oldJob.route)
  );
}

async function dealWithObsoleteJobs(
  oldJobs: JobDTO[],
  newJobs: RouteScheduleManifest,
  dryRun: boolean
) {
  const obsoleteJobs = computeObsoleteJobs(oldJobs, newJobs);

  if (obsoleteJobs.length === 0) {
    return;
  }

  console.error(
    `The following jobs are obsolete and ${
      dryRun ? "would" : "will"
    } be removed:\n`
  );
  console.log(formatRouteScheduleMapAsTable(obsoleteJobs));

  if (!dryRun) {
    await Promise.all(
      obsoleteJobs.map(async (job) => {
        const client = new QuirrelClient({
          async handler() {},
          route: job.route,
        });

        await client.delete("@cron");
      })
    );
  }
}

export async function updateCron(
  scheduleMap: RouteScheduleManifest,
  dryRun: boolean,
  production: boolean
) {
  if (production) {
    process.env.NODE_ENV = "production";
  }

  console.error(`These jobs ${dryRun ? "would" : "will"} be created:\n`);
  console.log(formatRouteScheduleMapAsTable(scheduleMap));

  const oldJobs = await getOldJobs();
  await dealWithObsoleteJobs(oldJobs, scheduleMap, dryRun);

  if (dryRun) {
    console.error(`This was a --dry-run, so nothing was applied.\n`);
  } else {
    console.error("Successfully updated jobs.");
  }
}

export default async function registerUpdateCron(program: Command) {
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
