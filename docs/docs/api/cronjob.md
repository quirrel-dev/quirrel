---
title: CronJob
---

CronJobs are specified very similar to Queues:

```ts title="pages/api/someCronJob.ts"
// This example is for Next.js,
// it works very similar for the other frameworks.
import { CronJob } from "quirrel/next";

export default CronJob(
  "api/someCronJob", // the route that it's reachable on
  "0 2 * * *", // every day at 2AM
  async (job) => {
    // do something
  }
);
```

This creates a new CronJob, which will immediately be picked up by your local Quirrel instance:

![](./registered-a-cron-job.png)

:::note
During development, your local Quirrel instance is able to detect `CronJob()` calls by watching your source directory.
To register cron jobs on deployment, run `quirrel ci` [during deployment](/docs/deploying)
:::

:::note
If you're struggling with cron syntax, check out [crontab guru](https://crontab.guru/).
:::
