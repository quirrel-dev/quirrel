import { Command } from "commander";
import { CronDetector, DetectedCronJob } from "../cron-detector";
import * as z from "zod";
import { cron } from "../../client/index";
import { stringifyBeautiful } from "../beatiful-json";
import Table from "easy-table";

export function formatDetectedJobsAsTable(jobs: DetectedCronJob[]) {
  return Table.print(
    jobs.map((j) => ({
      Route: j.route,
      Schedule: j.isValid ? j.schedule : j.schedule + " (invalid, skipping)",
    }))
  );
}

export async function detectCron(cwd: string) {
  const detector = new CronDetector(cwd, undefined, true);
  await detector.awaitReady();

  const jobs = detector.getDetectedJobs();

  await detector.close();

  return jobs;
}

export const RouteScheduleManifestSchema = z.array(
  z.object({ route: z.string(), schedule: cron })
);
export type RouteScheduleManifest = z.TypeOf<
  typeof RouteScheduleManifestSchema
>;

function detectedJobsToRouteScheduleMap(
  jobs: DetectedCronJob[]
): RouteScheduleManifest {
  return jobs
    .filter((j) => j.isValid)
    .map((j) => ({ route: j.route, schedule: j.schedule }));
}

export default async function registerDetectCron(program: Command) {
  program
    .command("detect-cron [cwd]")
    .description("Detects cron jobs.")
    .option(
      "--json",
      "Output as JSON instead of a human-readable table.",
      false
    )
    .action(async (cwd = process.cwd(), { json }: { json: boolean }) => {
      const jobs = await detectCron(cwd);

      if (json) {
        console.log(stringifyBeautiful(detectedJobsToRouteScheduleMap(jobs)));
      } else {
        console.log(formatDetectedJobsAsTable(jobs));
      }
    });
}
