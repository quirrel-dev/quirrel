---
title: Monthly Invoices
---

For this, Quirrel's [`CronJob`](https://docs.quirrel.dev/api/cronjob) is the perfect fit.

```ts title="app/api/monthly-invoice.ts"
import db from "db";
import { CronJob } from "quirrel/blitz";
import stripe from "stripe";

export default CronJob(
  "api/monthly-invoice", // 👈 the route that it's reachable on
  "0 0 1 * *", // same as @monthly (see https://crontab.guru/)
  async () => {
    const customers = await db.customers.findAll();
    await Promise.all(
      customers.map(async (customer) => {
        await stripe.finalizeInvoice(customer.stripeId);
      })
    );
  }
);
```
