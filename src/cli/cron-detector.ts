import { cronExpression, QuirrelClient, timezone } from "../client/index";
import fs from "fs";
import type { FastifyInstance } from "fastify";
import { makeFetchMockConnectedTo } from "./fetch-mock";
import * as chokidar from "chokidar";
import { parseChokidarRulesFromGitignore } from "./parse-gitignore";
import * as babel from "@babel/parser";
import traverse from "@babel/traverse";

function requireFrameworkClientForDevelopmentDefaults(framework: string) {
  require(`../${framework}`);
}

export interface DetectedCronJob {
  route: string;
  schedule: string | [string, string];
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

  const ast = babel.parse(file, { sourceType: "unambiguous" });
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
    },
  });

  if (!cronSchedule || !jobName) {
    return null;
  }

  return {
    route: jobName,
    schedule: cronTimezone ? [cronSchedule, cronTimezone] : cronSchedule,
    framework: clientFramework,
    isValid:
      cronExpression.safeParse(cronSchedule).success &&
      timezone.optional().safeParse(cronTimezone).success,
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
    const [cronExpression, cronTimezone] = job.schedule;
    await client?.enqueue(null, {
      id: "@cron",
      override: true,
      repeat: {
        cron: cronTimezone ? [cronExpression, cronTimezone] : cronExpression,
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

      const contents = fs.readFileSync(filePath, "utf-8");
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
