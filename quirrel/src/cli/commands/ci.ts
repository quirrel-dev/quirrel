import { Command } from "commander";
import Table from "easy-table";
import { CronDetector, DetectedCronJob } from "../cron-detector";

function printDetectedJobs(jobs: Iterable<DetectedCronJob>) {
  console.log("Detected the following Jobs:\n");

  const t = new Table();

  for (const job of jobs) {
    t.cell("Route", job.route);
    if (job.isValid) {
      t.cell("Schedule", job.schedule);
    } else {
      t.cell("Schedule", job.schedule + " (invalid, skipping)");
    }

    t.newRow();
  }

  console.log(t.toString());
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

        const detector = new CronDetector(cwd, undefined, dryRun);
        await detector.readExisting();

        const jobs = detector.getDetectedJobs();

        printDetectedJobs(jobs);

        if (dryRun) {
          console.log("Skipping registration.");
        } else {
          console.log("Successfully registered with Quirrel.");
        }
      }
    );
}
