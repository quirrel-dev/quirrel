---
title: Migrating to v1
---

On 4th of January, Quirrel 1.0 was released.

What's new?

- new, heavily improved [`CronJob`](/api/cronjob)
- there are new clients for:
  - [Redwood](/api/redwood)
  - [Nuxt.js](/api/nuxt)
  - [Express](/api/express)
  - [Vercel Serverless Functions](/api/vercel)
- [ui.quirrel.dev](https://ui.quirrel.dev) can be used for monitoring production

The full release notes can be found [here](https://github.com/quirrel-dev/quirrel/releases/tag/v1.0.0).

To enable the new client libraries, there are two breaking changes:

- `@quirrel/next` is deprecated in favor of `quirrel/next` (notice the missing `@`)
- Next.js users need to include `api/` in their Queue's route string.

To migrate your project to v1, follow these steps:

1. `npm uninstall @quirrel/next`
1. `npm install --save-prod quirrel@latest`
1. ```diff title="Apply these changes to all of your Queues:"
   -import { Queue } from "@quirrel/next"
   +import { Queue } from "quirrel/next"
   // ...
   export default Queue(
   - "someQueue",
   + "api/someQueue",
     async () => {
       // ...
     }
   )
   ```
1. Optional: Transition your self-made cron jobs to Quirrel's new [`CronJob()`](/api/cronjob)

