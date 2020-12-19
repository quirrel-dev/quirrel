import { CronJob } from "quirrel/next";

export default CronJob("fetchDataCron", "@hourly", async () => {});
