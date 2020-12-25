import { promises as fs } from "fs";
import globby from "globby";
import * as path from "path";
import { QuirrelClient } from "../client";
import Table from "easy-table";
import { cron } from "../client/index";

async function grepForJavascriptFiles(directory: string) {
  return await globby(["**/*.[jt]s", "**/*.[jt]sx"], {
    cwd: directory,
    gitignore: true,
    dot: true,
    ignore: ["node_modules"],
  });
}

async function readFiles(cwd: string, paths: string[]) {
  return await Promise.all(
    paths.map((p) => fs.readFile(path.join(cwd, p), "utf-8"))
  );
}

interface DetectedCronJob {
  route: string;
  schedule: string;
  framework: string;
  isValid: boolean;
}

function detectQuirrelCronJob(file: string): DetectedCronJob | null {
  const quirrelImport = /"quirrel\/(.*)"/.exec(file);
  if (!quirrelImport) {
    return null;
  }

  const clientFramework = quirrelImport[1];
  const isNextBased = ["blitz", "next"].includes(clientFramework);

  const jobNameResult = /CronJob\(['"](.*)["'],\s*["'](.*)["']/.exec(file);
  if (!jobNameResult) {
    return null;
  }

  let jobName = jobNameResult[1];
  const cronSchedule = jobNameResult[2];

  if (isNextBased && !jobName.startsWith("api/")) {
    jobName = "api/" + jobName;
  }

  return {
    route: jobName,
    schedule: cronSchedule,
    framework: clientFramework,
    isValid: cron.check(cronSchedule),
  };
}

async function detectCronJobs(
  cwd: string = process.cwd()
): Promise<DetectedCronJob[]> {
  const filePaths = await grepForJavascriptFiles(cwd);
  const fileContents = await readFiles(cwd, filePaths);
  const cronJobs = fileContents
    .map(detectQuirrelCronJob)
    .filter((v): v is DetectedCronJob => !!v);
  return cronJobs;
}

interface RegisterCronArgs {
  cwd: string;
  dryRun: boolean;
}

function printDetectedJobs(jobs: DetectedCronJob[]) {
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

function requireFrameworkClientForDevelopmentDefaults(framework: string) {
  require(`../${framework}`);
}

async function registerJobsWithQuirrel(jobs: DetectedCronJob[]) {
  for (const job of jobs) {
    if (!job.isValid) {
      continue;
    }

    requireFrameworkClientForDevelopmentDefaults(job.framework);

    const client = new QuirrelClient({
      async handler() {},
      route: job.route,
    });

    await client.enqueue(null, {
      repeat: {
        cron: job.schedule,
      },
      id: "register-cron",
      override: true,
    });
  }
}

export async function registerCron(args: RegisterCronArgs) {
  const jobs = await detectCronJobs(args.cwd);

  printDetectedJobs(jobs);

  if (args.dryRun) {
    console.log("Skipping registration.");
  } else {
    await registerJobsWithQuirrel(jobs);
    console.log("Successfully registered with Quirrel.");
  }
}
