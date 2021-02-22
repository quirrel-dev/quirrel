import { cron, QuirrelClient } from "../client/index";
import { promises as fs } from "fs";
import type { FastifyInstance } from "fastify";
import { makeFetchMockConnectedTo } from "./fetch-mock";
import * as chokidar from "chokidar";
import { parseChokidarRulesFromGitignore } from "./parse-gitignore";

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

  const jobNameResult = /CronJob\(\s*(?:\/[\/\*].*)?\s*['"](.*)["'],\s*(?:\/[\/\*].*)?\s*["'](.*)["']/.exec(
    file
  );
  if (!jobNameResult) {
    return null;
  }

  let jobName = jobNameResult[1];
  const cronSchedule = jobNameResult[2];

  return {
    route: jobName,
    schedule: cronSchedule,
    framework: clientFramework,
    isValid: cron.safeParse(cronSchedule).success,
  };
}

export class CronDetector {
  private watcher: chokidar.FSWatcher;
  private ready = false;

  constructor(
    private readonly cwd: string,
    private readonly connectedTo?: FastifyInstance,
    private readonly dryRun?: boolean
  ) {
    const rules = parseChokidarRulesFromGitignore(cwd);
    this.watcher = chokidar.watch(["**/*.[jt]s", "**/*.[jt]sx"], {
      ignored: ["**/node_modules", ...rules.ignoredPaths],
      cwd,
    });

    this.watcher.on("add", this.on("added"));
    this.watcher.on("change", this.on("changed"));
    this.watcher.on("unlink", this.on("deleted"));
    this.watcher.on("ready", () => {
      this.ready = true;
    });
  }

  public async close() {
    await this.watcher.close();
  }

  public async awaitReady() {
    if (this.ready) {
      return;
    }

    await new Promise((resolve) => {
      this.watcher.on("ready", resolve);
    });
  }

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

      if (fileChangeType === "deleted") {
        if (previousJob) {
          await this.onJobRemoved(previousJob, filePath);
        }

        return;
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
