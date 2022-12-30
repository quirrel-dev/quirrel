import { Command } from "commander";
import { CronDetector, DetectedCronJob } from "../cron-detector.js";
import * as z from "zod";
import { cronExpression } from "../../client/index.js";
import { stringifyBeautiful } from "../beatiful-json.js";
import Table from "easy-table";

export function formatDetectedJobsAsTable(jobs: DetectedCronJob[]) {
  return Table.print(
    jobs.map((j) => ({
      Route: j.route,
      Schedule: j.isValid ? j.schedule : j.schedule + " (invalid, skipping)",
      Timezone: j.timezone
    }))
  );
}

export async function detectCron(cwd: string) {
  const detector = new CronDetector(cwd);
  await detector.awaitReady();

  const jobs = detector.getDetectedJobs();

  await detector.close();

  return jobs;
}

export const RouteScheduleManifestSchema = z.array(
  z.object({ route: z.string(), schedule: cronExpression, timezone: z.string() })
);
export type RouteScheduleManifest = z.TypeOf<
  typeof RouteScheduleManifestSchema
>;

export function detectedJobsToRouteScheduleManifest(
  jobs: DetectedCronJob[]
): RouteScheduleManifest {
  return jobs
    .filter((j) => j.isValid)
    .map((j) => ({ route: j.route, schedule: j.schedule, timezone: j.timezone }));
}

export default function registerDetectCron(program: Command) {
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
        console.log(stringifyBeautiful(detectedJobsToRouteScheduleManifest(jobs)));
      } else {
        console.log(formatDetectedJobsAsTable(jobs));
      }
    });
}
