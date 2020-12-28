import type { FastifyInstance } from "fastify";
import { Gaze } from "gaze";
import { QuirrelClient } from "../client/index";
import * as fs from "fs/promises";
import {
  detectQuirrelCronJob,
  requireFrameworkClientForDevelopmentDefaults,
  DetectedCronJob,
} from "./register-cron";
import globby from "globby";

export class CronWatcher {
  private gaze: any;

  constructor(
    private readonly quirrel: FastifyInstance,
    private readonly cwd: string
  ) {
    globby(["**/*.[jt]s", "**/*.[jt]sx"], {
      cwd: this.cwd,
      gitignore: true,
      dot: true,
      ignore: ["node_modules"],
    }).then((files) => {
      files.forEach((file) => this.on("added")(file));
    });
  }

  public startWatching() {
    this.gaze = new Gaze(["**/*.[jt]s", "**/*.[jt]sx"], {
      cwd: this.cwd,
    });

    this.gaze.on("changed", this.on("changed"));
    this.gaze.on("deleted", this.on("deleted"));
    this.gaze.on("added", this.on("added"));
  }

  private pathToCronJob: Partial<Record<string, DetectedCronJob>> = {};

  private on(fileChangeType: "changed" | "deleted" | "added") {
    return async (filePath: string) => {
      const previousCron = this.pathToCronJob[filePath];

      const contents = await fs.readFile(filePath, "utf-8");
      const job = detectQuirrelCronJob(contents);

      if (!job) {
        if (previousCron) {
          delete this.pathToCronJob[filePath];

          const client = this.getConnectedClient(previousCron);
          await client.delete("@cron");
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
        delete this.pathToCronJob[filePath];

        await client.delete("@cron");
      }

      if (fileChangeType === "added" || fileChangeType === "changed") {
        if (previousCron?.schedule === job.schedule) {
          return;
        }

        this.pathToCronJob[filePath] = job;
        await client.enqueue(null, {
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
    requireFrameworkClientForDevelopmentDefaults(job.framework);

    return new QuirrelClient({
      async handler() {},
      route: job.route,
      fetch: async (url, conf) => {
        const [, , , , path] = /(http:\/\/)(.*?)(:\d+)?(\/.*)/.exec(
          url as string
        )!;

        const response = await this.quirrel.inject({
          method: conf?.method as any,
          headers: conf?.headers as any,
          payload: conf?.body as any,
          path,
        });

        return {
          status: response.statusCode,
          statusText: response.statusMessage,
          text: async () => response.payload,
          json: async () => response.json(),
        } as any;
      },
    });
  }

  public close() {
    this.gaze.close();
  }
}
