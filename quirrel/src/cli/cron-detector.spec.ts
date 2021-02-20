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
};

describe("detectQuirrelCronJob", () => {
  Object.entries(cases).forEach(([name, { input, output }]) => {
    test(name, () => {
      expect(detectQuirrelCronJob(input)).toEqual(output);
    });
  });
});
