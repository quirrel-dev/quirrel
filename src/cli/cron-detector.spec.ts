import { detectQuirrelCronJob } from "./cron-detector";

const cases: Record<
  string,
  { input: string; output: ReturnType<typeof detectQuirrelCronJob> }
> = {
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
      timezone: "Etc/UTC",
    },
  },
  timezone: {
    input: `
import { CronJob } from "quirrel/blitz"
export default CronJob(
  "api/bigBen",
  ["*/30 * * * *", "Europe/London"],
  async () => {
    console.log("Ding don, I'm Big Ben")
  }
)
    `,
    output: {
      framework: "blitz",
      isValid: true,
      route: "api/bigBen",
      schedule: "*/30 * * * *",
      timezone: "Europe/London",
    },
  },
  nonExistantTimezone: {
    input: `
import { CronJob } from "quirrel/blitz"
export default CronJob(
  "api/hourlyCron",
  ["@hourly", "Europe/NonExistant"],
  async () => {}
)
    `,
    output: {
      framework: "blitz",
      isValid: false,
      route: "api/hourlyCron",
      schedule: "@hourly",
      timezone: "Europe/NonExistant",
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
      timezone: "Etc/UTC",
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
      timezone: "Etc/UTC",
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
      timezone: "Etc/UTC",
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
      timezone: "Etc/UTC",
    },
  },

  "syntax errors": {
    input: `import {} from "quirrel/next"; { ( } }`,
    output: null,
  },

  "user-land cronjob": {
    input: `
import * as QuirrelNext from "quirrel/next"

function CronJob(route: string, schedule: string, handler: () => Promise<void>) {
  const client = new QuirrelClient({
    route,
    handler,
  })

  return async function POST(request: Request) {
    const { body, headers, status } = await client.respondTo(
      await request.text(),
      Object.fromEntries([...request.headers.entries()])
    );
  
    return new Response(body, { headers, status });
  }
}

export const POST = CronJob("/api/test", "0 15 * * *", async () => { /* ... */ })
    `,
    output: {
      isValid: true,
      schedule: "0 15 * * *",
      framework: "next",
      route: "api/test",
      timezone: "Etc/UTC",
    },
  },
};

describe("detectQuirrelCronJob", () => {
  Object.entries(cases).forEach(([name, { input, output }]) => {
    if (!name.includes("user-land")) return
    test(name, () => {
      expect(detectQuirrelCronJob(input)).toEqual(output);
    });
  });
});
