import { CronJob } from "quirrel/next";

export default CronJob("api/fetchDataCron", "@hourly", async () => {
  console.log("hello world");
});
