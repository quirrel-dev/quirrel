import { detectQuirrelCronJob } from "./cron-detector";

const cases = {
  naive: {
    input: `
import { CronJob } from "quirrel/blitz"
export default CronJob(
  "api/hourlyCron",
  "@hourly",
  async () => {
    console.log("A new hour has begun!")
  }
)
    `,
    output: {
      framework: "blitz",
      isValid: true,
      route: "api/hourlyCron",
      schedule: "@hourly",
    },
  },
  "with comments": {
    input: `
import { CronJob } from "quirrel/blitz"
export default CronJob(
  "api/hourlyCron", // the path of this API route
  "@hourly", // cron schedule (see https://crontab.guru)
  async () => {
    console.log("A new hour has begun!")
  }
)
    `,
    output: {
      framework: "blitz",
      isValid: true,
      route: "api/hourlyCron",
      schedule: "@hourly",
    },
  },
  "with block comments": {
    input: `
import { CronJob } from "quirrel/blitz"
export default CronJob(
  "api/hourlyCron", /* the path of this API route */
  "@hourly", // cron schedule (see https://crontab.guru)
  async () => {
    console.log("A new hour has begun!")
  }
)
    `,
    output: {
      framework: "blitz",
      isValid: true,
      route: "api/hourlyCron",
      schedule: "@hourly",
    },
  },
  "repro tarshan": {
    input: `
import { CronJob } from 'quirrel/redwood'

export const handler = CronJob('admin-report-email-task-daily', '0 15 * * *', async () => {})
    `,
    output: {
      framework: "redwood",
      isValid: true,
      route: "admin-report-email-task-daily",
      schedule: "0 15 * * *",
    },
  },
  arguments: {
    input: `
import { CronJob } from 'quirrel/redwood'

export const handler = CronJob('admin-report-email-task-daily', '0 15 * * *', async (name: string) => {})
    `,
    output: {
      framework: "redwood",
      isValid: true,
      route: "admin-report-email-task-daily",
      schedule: "0 15 * * *",
    },
  },

  "syntax errors": {
    input: `import {} from "quirrel/next"; { ( } }`,
    output: null,
  },
};

describe("detectQuirrelCronJob", () => {
  Object.entries(cases).forEach(([name, { input, output }]) => {
    test(name, () => {
      expect(detectQuirrelCronJob(input)).toEqual(output);
    });
  });
});
