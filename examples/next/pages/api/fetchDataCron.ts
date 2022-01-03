import { CronJob } from "quirrel/next";

export default CronJob("api/fetchDataCron", ["@hourly", "Europe/Stockholm"], async () => {
  console.log("hello world");
});
