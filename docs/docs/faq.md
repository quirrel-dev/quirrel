---
title: FAQ
---

## My encryption secret has been leaked. What now?

First of all: Don't panic. The leaked encryption key allows attackers to read the payload of pending jobs, but only if they _also_ gained access to your Quirrel API deployment ([managed](https://quirrel.dev) or self-hosted).

To replace your leaked secret with a new one, do the following:

1. Set the `QUIRREL_OLD_SECRETS` environment variable to `["<your-leaked-secret>"]`. This will allow old jobs to be decrypted.
2. Set `QUIRREL_ENCRYPTION_SECRET` to your new secret.
3. Once all jobs that were encrypted with the old secret executed, remove `QUIRREL_OLD_SECRETS`.

If you're using the managed Quirrel deployment, feel free to [reach out](mailto:info@quirrel.dev) to get further assistance.

## How can I make Quirrel automatically startup with my dev environment?

You can use something like [`concurrently`](https://github.com/kimmobrunfeldt/concurrently):

```json
"scripts": {
  "dev": "concurrently --raw \"quirrel\" \"next dev\"",
  ...
}
```

## How can I opt out of telemetry?

Telemetry allows us to accurately gauge Quirrels feature usage and pain points across all users.
This data will let us better tailor Quirrel to users, ensuring its best-in-class developer experience.

Quirrel collects completely anonymous telemetry data about general usage, it also sends error reports to Sentry.
Participation in this anonymous program is optional, and you may opt-out if you'd not like to share any information.
To opt-out, set the DISABLE_TELEMETRY environment variable to 1.

## What counts as an API Call?

Quirrel keeps track of how many API calls were made using a specific token.
This is primarily used for the [hosted version's](https://quirrel.dev) billing.

There's two main things that count as an "API Call":

- Your Application calling Quirrel, e.g. for enqueueing a job or fetching pending jobs.
- Quirrel calling your application (during execution)

Let's do a quick example:  
You enqueue two jobs that each repeat thrice.
After their second repetition, you call `.delete()` on them.
How many API Calls would that use?

| API Calls | Action                               |
| --------- | ------------------------------------ |
| 2         | .enqueue twice                       |
| 2x2       | execution (two jobs, two executions) |
| 2         | .delete twice                        |
| <u>8</u>  | <u>sum</u>                           |
