import { Gaze } from "gaze";
import { cron, QuirrelClient } from "../client/index";
import * as fs from "fs/promises";
import globby from "globby";
import type { FastifyInstance } from "fastify";
import { makeFetchMockConnectedTo } from "./fetch-mock";

export function requireFrameworkClientForDevelopmentDefaults(
  framework: string
) {
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

  public async readExisting() {
    const files = await globby(["**/*.[jt]s", "**/*.[jt]sx"], {
      cwd: this.cwd,
      gitignore: true,
      dot: true,
      ignore: ["node_modules"],
    });

    files.forEach(this.on("added"));
  }

  public startWatching() {
    this.gaze = new Gaze(["**/*.[jt]s", "**/*.[jt]sx"], {
      cwd: this.cwd,
    });

    this.gaze.on("changed", this.on("changed"));
    this.gaze.on("deleted", this.on("deleted"));
    this.gaze.on("added", this.on("added"));
  }

  private pathToCronJob = new Map<string, DetectedCronJob>();

  public getDetectedJobs(): Iterable<DetectedCronJob> {
    return this.pathToCronJob.values();
  }

  private on(fileChangeType: "changed" | "deleted" | "added") {
    return async (filePath: string) => {
      const previousCron = this.pathToCronJob.get(filePath);

      const contents = await fs.readFile(filePath, "utf-8");
      const job = detectQuirrelCronJob(contents);

      if (!job) {
        if (previousCron) {
          this.pathToCronJob.delete(filePath);

          const client = this.getConnectedClient(previousCron);
          await client?.delete("@cron");
        }

        return;
      }

      if (!job.isValid) {
        console.error(`
🚨 Encountered invalid cron expression: ${job.schedule}`);
        return;
      }

      const client = this.getConnectedClient(job);

      if (fileChangeType === "deleted") {
        this.pathToCronJob.delete(filePath);

        await client?.delete("@cron");
      }

      if (fileChangeType === "added" || fileChangeType === "changed") {
        if (previousCron?.schedule === job.schedule) {
          return;
        }

        this.pathToCronJob.set(filePath, job);
        await client?.enqueue(null, {
          id: "@cron",
          override: true,
          repeat: {
            cron: job.schedule,
          },
        });
      }
    };
  }

  private getConnectedClient(job: DetectedCronJob) {
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

  public close() {
    this.gaze.close();
  }
}
