import { Command } from "commander";
import Table from "easy-table";
import { QuirrelClient } from "../../client";
import { getApplicationBaseUrl } from "../../client/config";
import type { JobDTO } from "../../client/job";
import { CronDetector, DetectedCronJob } from "../cron-detector";
import * as z from "zod";

interface Logger {
  detectedJobs(jobs: DetectedCronJob[]): void;
  obsoleteJobs(jobs: DetectedCronJob[]): void;
  finish(): void;
}

class HumanReadableLogger implements Logger {
  constructor(private readonly dryRun: boolean) {}
  private printAsTable(jobs: DetectedCronJob[]) {
    console.log(
      Table.print(
        jobs.map((j) => ({
          Route: j.route,
          Schedule: j.isValid
            ? j.schedule
            : j.schedule + " (invalid, skipping)",
        }))
      )
    );
  }
  detectedJobs(jobs: DetectedCronJob[]) {
    console.error("Detected the following Jobs:\n");
    this.printAsTable(jobs);
  }
  obsoleteJobs(jobs: DetectedCronJob[]) {
    console.error("The following jobs are obsolete and will be removed:\n");
    this.printAsTable(jobs);
  }
  finish() {
    if (this.dryRun) {
      console.log("Skipping registration.");
    } else {
      console.log("Successfully updated.");
    }
  }
}

class JsonLogger implements Logger {
  constructor(private readonly dryRun: boolean) {}
  private detected?: DetectedCronJob[];
  detectedJobs(jobs: DetectedCronJob[]) {
    this.detected = jobs;
  }
  private obsolete?: DetectedCronJob[];
  obsoleteJobs(jobs: DetectedCronJob[]) {
    this.obsolete = jobs;
  }
  private printBeatifully(value: any) {
    console.log(JSON.stringify(value, null, 4));
  }
  private transformToRouteScheduleMap(
    jobs: DetectedCronJob[]
  ): Record<string, string> {
    return Object.fromEntries(
      jobs.filter((j) => j.isValid).map((j) => [j.route, j.schedule])
    );
  }
  finish() {
    this.printBeatifully({
      detected: this.transformToRouteScheduleMap(this.detected ?? []),
      obsolete: this.transformToRouteScheduleMap(this.obsolete ?? []),
      dryRun: this.dryRun,
    });
  }
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
  dryRun: boolean,
  logger: Logger
) {
  const obsoleteJobs = computeObsoleteJobs(oldJobs, newJobs);

  if (obsoleteJobs.length === 0) {
    return;
  }

  logger.obsoleteJobs(obsoleteJobs);

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
    .option(
      "--json",
      "Output as JSON instead of a human-readable table.",
      false
    )
    .option("-p, --production", "Use production config.", false)
    .action(
      async (
        cwd = process.cwd(),
        {
          dryRun,
          production,
          json,
        }: { dryRun: boolean; production: boolean; json: boolean }
      ) => {
        if (production) {
          process.env.NODE_ENV = "production";
        }

        const logger: Logger = json
          ? new JsonLogger(dryRun)
          : new HumanReadableLogger(dryRun);

        const oldJobs = await getOldJobs();

        const detector = new CronDetector(cwd, undefined, dryRun);
        await detector.awaitReady();

        const jobs = detector.getDetectedJobs();

        await detector.close();

        logger.detectedJobs(jobs);

        await dealWithObsoleteJobs(oldJobs, jobs, dryRun, logger);

        logger.finish();
      }
    );
}
