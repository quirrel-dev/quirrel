import { Command } from "commander";
import { detectCron, detectedJobsToRouteScheduleManifest } from "./detect-cron.js";
import { updateCron } from "./update-cron.js";

export default function registerCI(program: Command) {
  program
    .command("ci [cwd]")
    .description("Detects & registers cron jobs.")
    .option("-d, --dry-run", "Only detect, don't update.", false)
    .option("-p, --production", "Use production config.", false)
    .action(quirrelCI);
}

export async function quirrelCI(
  cwd = process.cwd(),
  { dryRun, production }: { dryRun: boolean; production: boolean }
) {
  const detectedJobs = await detectCron(cwd);

  const routeScheduleMap = detectedJobsToRouteScheduleManifest(detectedJobs);

  await updateCron(routeScheduleMap, dryRun, production);
}
