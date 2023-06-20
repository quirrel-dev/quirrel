---
title: Connecting your Application
---

To deploy Quirrel, first set up your Quirrel server via [Docker](./docker), [Railway](./railway) or [Fly.io](./fly).

There are three main environment variables you need to specify in your deployment settings:

| Variable                    | Meaning                                                                                      | Where to get                                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUIRREL_TOKEN`             | access token for the Quirrel server.                                                         | See "Acquire a token" section below                                                                                                                                                                        |
| `QUIRREL_BASE_URL`          | The base URL of your application's deployment.                                               | You probably know this. Something like `my-application.com`.                                                                                                                     |
| `QUIRREL_ENCRYPTION_SECRET` | A 32-character-long secret used for end-to-end encryption of your jobs.                      | Can be generated using `openssl rand -hex 16` or [random.org](https://www.random.org/strings/?num=2&len=16&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new). |
| `QUIRREL_API_URL`           | The endpoint your Quirrel Server is running under, e.g. http://your-quirrel-api-address:9181 |                                                                                                                                                                                  |

After setting these variables, you can deploy your application and Quirrel should be working.
If it doesn't, feel free to [reach out](mailto:troubleshooting@quirrel.dev).

:::note Cron Jobs
If you're using [CronJobs()](/api/cronjob), make sure to run `quirrel ci` during the deploy process.
Make sure to have `QUIRREL_API_URL`, a `QUIRREL_TOKEN` and the `QUIRREL_BASE_URL` set when executing `quirrel ci`.

```json
"scripts": { "build": "npm run build && quirrel ci" }
```

:::

:::note VERCEL*URL
If you're on Vercel, you can connect `QUIRREL_BASE_URL` to your `VERCEL_URL`.
Only do this for preview environments, \_not for production*!
`QUIRREL_BASE_URL` is used to determine the deployment that your jobs should be executed on.
If you set it to `VERCEL_URL`, that means all jobs will be executed on the exact deployment that they were
created on, excluding them from future bugfixes.
To connect `QUIRREL_BASE_URL` to `VERCEL_URL`, set its value to `@VERCEL_URL` ([notice the @](https://github.com/quirrel-dev/quirrel/blob/d268f0555211afb202c3c3b12b460d14f0f0fb86/quirrel/src/client/config.ts#L12)).
:::

### Acquire a token

You can acquire an authentication token from your Quirrel Server by running this command:

`curl --user ignored:{PASSPHRASE} -X PUT {QUIRREL_SERVER_URL}/tokens/{NAME_OF_TOKEN}`

> The fields inside of `{}` are placeholders and should be replaced by you.
