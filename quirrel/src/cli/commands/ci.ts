import { Command } from "commander";
import Table from "easy-table";
import { QuirrelClient } from "../../client";
import { getApplicationBaseUrl } from "../../client/config";
import type { JobDTO } from "../../client/job";
import { CronDetector, DetectedCronJob } from "../cron-detector";

function printDetectedJobs(jobs: DetectedCronJob[]) {
  console.log(
    Table.print(
      jobs.map((j) => ({
        Route: j.route,
        Schedule: j.isValid ? j.schedule : j.schedule + " (invalid, skipping)",
      }))
    )
  );
}

async function getOldJobs() {
  const quirrel = new QuirrelClient({
    async handler() {},
    route: "",
  });

  const endpointsRes = await quirrel.makeRequest("/queues/");
  const endpoints = (await endpointsRes.json()) as string[];

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

function computeObsoleteJobs(oldJobs: JobDTO[], newJobs: DetectedCronJob[]) {
  const applicationBaseUrl = getApplicationBaseUrl();

  const oldJobsAsDetected = oldJobs.map(
    (j): DetectedCronJob => ({
      framework: "doesn't matter",
      isValid: true,
      route: j.endpoint.slice(applicationBaseUrl.length + 1),
      schedule: j.repeat!.cron!,
    })
  );

  return oldJobsAsDetected.filter(
    (oldJob) => !newJobs.some((newJob) => newJob.route === oldJob.route)
  );
}

async function dealWithObsoleteJobs(
  oldJobs: JobDTO[],
  newJobs: DetectedCronJob[],
  dryRun: boolean
) {
  const obsoleteJobs = computeObsoleteJobs(oldJobs, newJobs);

  if (obsoleteJobs.length === 0) {
    return;
  }

  console.log("The following jobs are obsolete and will be removed:\n");
  printDetectedJobs(obsoleteJobs);

  if (!dryRun) {
    await Promise.all(
      obsoleteJobs.map(async (obsoleteJob) => {
        const client = new QuirrelClient({
          async handler() {},
          route: obsoleteJob.route,
        });

        await client.delete("@cron");
      })
    );
  }
}

export default async function registerCI(program: Command) {
  program
    .command("ci [cwd]")
    .description("Detects & registers cron jobs.")
    .option("-d, --dry-run", "Only detect, don't register.", false)
    .option("-p, --production", "Use production config.", false)
    .action(
      async (
        cwd = process.cwd(),
        { dryRun, production }: { dryRun: boolean; production: boolean }
      ) => {
        if (production) {
          process.env.NODE_ENV = "production";
        }

        const oldJobs = await getOldJobs();

        const detector = new CronDetector(cwd, undefined, dryRun);
        await detector.awaitReady();

        const jobs = detector.getDetectedJobs();

        await detector.close();

        console.log("Detected the following Jobs:\n");
        printDetectedJobs(jobs);

        await dealWithObsoleteJobs(oldJobs, jobs, dryRun);

        if (dryRun) {
          console.log("Skipping registration.");
        } else {
          console.log("Successfully updated.");
        }
      }
    );
}
