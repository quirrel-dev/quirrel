import { CronJob } from "quirrel/next";

export default CronJob("api/greetGarfieldCron", "@daily", async () => {
  console.log("greetings, garfield!");
});
