import { Gaze } from "gaze";
import { cron, QuirrelClient } from "../client/index";
import * as fs from "fs/promises";
import globby from "globby";
import type { FastifyInstance } from "fastify";
import { makeFetchMockConnectedTo } from "./fetch-mock";

function requireFrameworkClientForDevelopmentDefaults(framework: string) {
  require(`../${framework}`);
}

export interface DetectedCronJob {
  route: string;
  schedule: string;
  framework: string;
  isValid: boolean;
}

export function detectQuirrelCronJob(file: string): DetectedCronJob | null {
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

export class CronDetector {
  private gaze: any;

  constructor(
    private readonly cwd: string,
    private readonly connectedTo?: FastifyInstance,
    private readonly dryRun?: boolean
  ) {}

  private getQuirrelClient(job: DetectedCronJob) {
    if (this.dryRun) {
      return undefined;
    }

    requireFrameworkClientForDevelopmentDefaults(job.framework);

    return new QuirrelClient({
      async handler() {},
      route: job.route,
      fetch: this.connectedTo
        ? makeFetchMockConnectedTo(this.connectedTo)
        : undefined,
    });
  }

  public async readExisting() {
    const files = await globby(["**/*.[jt]s", "**/*.[jt]sx"], {
      cwd: this.cwd,
      gitignore: true,
      dot: true,
      ignore: ["node_modules"],
    });

    await Promise.all(files.map(this.on("added")));
  }

  public startWatching() {
    this.gaze = new Gaze(["**/*.[jt]s", "**/*.[jt]sx"], {
      cwd: this.cwd,
    });

    this.gaze.on("changed", this.on("changed"));
    this.gaze.on("deleted", this.on("deleted"));
    this.gaze.on("added", this.on("added"));

    return {
      stop: () => this.gaze.close(),
    };
  }

  private pathToCronJob: Record<string, DetectedCronJob> = {};

  public getDetectedJobs(): DetectedCronJob[] {
    return Object.values(this.pathToCronJob);
  }

  private async onNewJob(job: DetectedCronJob, filePath: string) {
    await this.onJobChanged(job, filePath);
  }

  private async onJobRemoved(job: DetectedCronJob, filePath: string) {
    delete this.pathToCronJob[filePath];

    const client = this.getQuirrelClient(job);
    await client?.delete("@cron");
  }

  private async onJobChanged(job: DetectedCronJob, filePath: string) {
    this.pathToCronJob[filePath] = job;

    const client = this.getQuirrelClient(job);
    await client?.enqueue(null, {
      id: "@cron",
      override: true,
      repeat: {
        cron: job.schedule,
      },
    });
  }

  private on(fileChangeType: "changed" | "deleted" | "added") {
    return async (filePath: string) => {
      const previousJob = this.pathToCronJob[filePath];

      if (fileChangeType === "deleted" && previousJob) {
        return await this.onJobRemoved(previousJob, filePath);
      }

      const contents = await fs.readFile(filePath, "utf-8");
      const newJob = detectQuirrelCronJob(contents);

      if (!newJob) {
        if (previousJob) {
          await this.onJobRemoved(previousJob, filePath);
        }

        return;
      }

      if (!newJob.isValid) {
        console.error(`
🚨Encountered invalid cron expression: ${newJob.schedule}`);
        return;
      }

      if (!previousJob && newJob) {
        return await this.onNewJob(newJob, filePath);
      }

      if (previousJob && newJob) {
        return await this.onJobChanged(newJob, filePath);
      }
    };
  }
}
