import { Command } from "commander";
import { CronDetector, DetectedCronJob } from "../cron-detector";
import { formatDetectedJobsAsTable } from "./ci";
import * as z from "zod";
import { cron } from "../../client/index";
import { stringifyBeautiful } from "../beatiful-json";

export async function detectCron(cwd: string) {
  const detector = new CronDetector(cwd, undefined, true);
  await detector.awaitReady();

  const jobs = detector.getDetectedJobs();

  await detector.close();

  return jobs;
}

const RouteScheduleMapSchema = z.record(cron);
type RouteScheduleMap = z.TypeOf<typeof RouteScheduleMapSchema>;

function detectedJobsToRouteScheduleMap(
  jobs: DetectedCronJob[]
): RouteScheduleMap {
  return Object.fromEntries(
    jobs.filter((j) => j.isValid).map((j) => [j.route, j.schedule])
  );
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
