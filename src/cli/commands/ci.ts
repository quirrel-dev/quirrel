import { Command } from "commander";
import { detectCron } from "./detect-cron";
import { updateCron } from "./update-cron";

export default async function registerCI(program: Command) {
  program
    .command("ci [cwd]")
    .description("Detects & registers cron jobs.")
    .option("-d, --dry-run", "Only detect, don't update.", false)
    .option("-p, --production", "Use production config.", false)
    .action(
      async (
        cwd = process.cwd(),
        { dryRun, production }: { dryRun: boolean; production: boolean }
      ) => {
        const detectedJobs = await detectCron(cwd);

        await updateCron(detectedJobs, dryRun, production);
      }
    );
}
