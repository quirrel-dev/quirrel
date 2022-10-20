import { cronExpression, timezone } from "../client/index";
import { cron } from "../client/index";
import fs from "fs";
import * as chokidar from "chokidar";
import { parseChokidarRulesFromGitignore } from "./parse-gitignore";
import * as babel from "@babel/parser";
import traverse from "@babel/traverse";
import path from "path";
import * as config from "../client/config";

export interface DetectedCronJob {
  route: string;
  schedule: string;
  timezone: string;
  framework: string;
  isValid: boolean;
}

export function detectQuirrelCronJob(file: string): DetectedCronJob | null {
  const quirrelImport = /["']quirrel\/(.*)["']/.exec(file);
  if (!quirrelImport) {
    return null;
  }

  const clientFramework = quirrelImport[1];

  let jobName: string | undefined;
  let cronSchedule: string | undefined;
  let cronTimezone: string | undefined;

  try {
    const ast = babel.parse(file, {
      sourceType: "unambiguous",
      plugins: ["typescript"],
    });
    traverse(ast, {
      CallExpression(path) {
        const { callee } = path.node;
        if (callee.type !== "Identifier" || callee.name !== "CronJob") {
          return;
        }

        if (path.node.arguments.length < 3) {
          return;
        }

        const [jobNameNode, cronScheduleNode] = path.node.arguments;
        if (jobNameNode.type !== "StringLiteral") {
          return;
        }

        jobName = jobNameNode.value;

        if (cronScheduleNode.type === "StringLiteral") {
          cronSchedule = cronScheduleNode.value;
        } else if (cronScheduleNode.type === "ArrayExpression") {
          if (cronScheduleNode.elements.length > 2) {
            return;
          }

          const [scheduleNode, timezoneNode] = cronScheduleNode.elements;
          if (scheduleNode?.type !== "StringLiteral") {
            return;
          }

          cronSchedule = scheduleNode.value;

          if (timezoneNode?.type !== "StringLiteral") {
            return;
          }

          cronTimezone = timezoneNode.value;
        }

        path.stop();
      },
    });

    if (!cronSchedule || !jobName) {
      return null;
    }

    return {
      route: config.withoutLeadingSlash(jobName),
      schedule: cronSchedule,
      timezone: cronTimezone ?? "Etc/UTC",
      framework: clientFramework,
      isValid:
        cron.safeParse(cronSchedule).success &&
        timezone.optional().safeParse(cronTimezone).success,
    };
  } catch (error) {
    return null;
  }
}

export class CronDetector {
  private watcher: chokidar.FSWatcher;
  private ready = false;

  constructor(
    private readonly cwd: string,
    private readonly onChange?: (jobs: DetectedCronJob[]) => void
  ) {
    const rules = parseChokidarRulesFromGitignore(cwd);
    this.watcher = chokidar.watch(["**/*.[jt]s", "**/*.[jt]sx"], {
      ignored: ["node_modules", "**/node_modules", ...rules.ignoredPaths],
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

  private pathToCronJob: Record<string, DetectedCronJob> = {};

  public getDetectedJobs(): DetectedCronJob[] {
    return Object.values(this.pathToCronJob);
  }

  private async onNewJob(job: DetectedCronJob, filePath: string) {
    await this.onJobChanged(job, filePath);
  }

  private emitChange() {
    this.onChange?.(this.getDetectedJobs());
  }

  private async onJobRemoved(job: DetectedCronJob, filePath: string) {
    delete this.pathToCronJob[filePath];

    this.emitChange();
  }

  private async onJobChanged(job: DetectedCronJob, filePath: string) {
    this.pathToCronJob[filePath] = job;

    this.emitChange();
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

      const contents = fs.readFileSync(path.join(this.cwd, filePath), "utf-8");
      const newJob = detectQuirrelCronJob(contents);

      if (!newJob) {
        if (previousJob) {
          await this.onJobRemoved(previousJob, filePath);
        }

        return;
      }

      if (!newJob.isValid) {
        console.error(
          `🚨Encountered invalid cron expression: ${newJob.schedule}`
        );
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
