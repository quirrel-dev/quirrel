import Table from "easy-table";
import { CronDetector, DetectedCronJob } from "./cron-detector";

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
interface RegisterCronArgs {
  cwd: string;
  dryRun: boolean;
}

export async function registerCron(args: RegisterCronArgs) {
  const detector = new CronDetector(args.cwd, undefined, args.dryRun);
  await detector.readExisting();

  const jobs = detector.getDetectedJobs();

  printDetectedJobs(jobs);

  if (args.dryRun) {
    console.log("Skipping registration.");
  } else {
    console.log("Successfully registered with Quirrel.");
  }
}
