---
title: Deploying
---

Deploying Quirrel is straight-forward.

There are three main environment variables you need to specify in your deployment settings:

| Variable                    | Meaning                                                                 | Where to get                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUIRREL_TOKEN`             | access token for the Quirrel server.                                    | **Hosted:** Create a new Project + Client in the [Dashboard](https://quirrel.dev/dashboard). **Self-Hosted:** Check [How to deploy our own server](#how-to-deploy-your-own-server) .         |
| `QUIRREL_BASE_URL`          | The base URL of your application's deployment.                               | You probably know this. Something like `my-application.com`.                                                                                                                     |
| `QUIRREL_ENCRYPTION_SECRET` | A 32-character-long secret used for end-to-end encryption of your jobs. | Can be generated using `openssl rand -hex 16` or [random.org](https://www.random.org/strings/?num=2&len=16&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new). |

After setting these variables, you can deploy your application and Quirrel should be working.
If it doesn't, feel free to [reach out](mailto:troubleshooting@quirrel.dev).

:::note Cron Jobs
If you're using [CronJobs()](/api/cronjob), make sure to run `quirrel ci` during the deploy process.

```json
"scripts": { "vercel-build": "npm run build && quirrel ci" }
```

:::

:::note VERCEL_URL
If you're on Vercel, you can connect `QUIRREL_BASE_URL` to your `VERCEL_URL`.
Only do this for preview environments, _not for production_!
`QUIRREL_BASE_URL` is used to determine the deployment that your jobs should be executed on.
If you set it to `VERCEL_URL`, that means all jobs will be executed on the exact deployment that they were
created on, excluding them from future bugfixes.
To connect `QUIRREL_BASE_URL` to `VERCEL_URL`, set its value to `@VERCEL_URL` ([notice the @](https://github.com/quirrel-dev/quirrel/blob/d268f0555211afb202c3c3b12b460d14f0f0fb86/quirrel/src/client/config.ts#L12)).
:::

## Hosted version

For most people, the [hosted version](https://quirrel.dev) of Quirrel is the easiest, and probably also cheapest way of using Quirrel (there's a free tier if your project is just starting out, and OSS and side projects can apply for discounts).

## How to deploy your own server

🐉 Here be dragons: Running your own infrastructure isn't the easiest thing in the world, and you should know what you're doing.

### Deploy the Image

It's recommended to deploy Quirrel using the Docker Image: https://github.com/orgs/quirrel-dev/packages/container/package/quirrel

Set the `REDIS_URL` environment variable to a connection string for your Redis instance. **Make sure your Redis instance is persistent**.

Set the `PASSPHRASES` environment variable to some secret passphrase. You can also specify multiple by `:`-separating them.

### Acquire a token

Once our server is ready, we'll need to [get an auth token](https://api.quirrel.dev/documentation/static/index.html#/Admin/put_tokens__id_):

`curl --user ignored:{PASSPHRASE} -X PUT {QUIRREL_SERVER_URL}/tokens/{NAME_OF_TOKEN}`

> The fields inside of `{}` are placeholders and should be replaced by you.

Save the returned token for the next step.

### Connect your application to the Quirrel deployment

Configure your application to connect to your Quirrel deployment by specifying the following two environment variables:

```
QUIRREL_API_URL=http://your-quirrel-api-address:9181
QUIRREL_TOKEN=<token-generated-in-previous-step>
```
