---
title: Deploying
---

## Deploying Quirrel Server

Quirrel consists of two parts: A server that maintains your queues + cron jobs, and an application that enqueues + executes them.
Deploying to [Railway](https://railway.app) is straight forward using [the guide](https://github.com/quirrel-dev/quirrel-on-railway),
there's also an in-depth tutorial on [how to deploy to fly.io](https://dev.to/remixtape/self-hosting-quirrel-5af7).

### Deploy using Docker

If you want to use neither Railway nor Fly.io, you can use the official Docker Image

1. Get a Redis Instance, enable persistance.
2. Deploy [the Quirrel image](https://github.com/orgs/quirrel-dev/packages/container/package/quirrel).

- Point the `REDIS_URL` environment variable towards your Redis instance
- Set the `PASSPHRASES` environment variable to some secret password

3. You can open the `/endpoint` to verify everything's working.
4. Acquire a token by calling `curl --user ignored:<your-passphrase> -X PUT <your-server-url>/tokens/foo`

## Connecting your Application

Deploying Quirrel is straight-forward.

There are three main environment variables you need to specify in your deployment settings:

| Variable                    | Meaning                                                                 | Where to get                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUIRREL_TOKEN`             | access token for the Quirrel server.                                    | **Hosted:** Create a new Project + Client in the [Dashboard](https://quirrel.dev/dashboard). **Self-Hosted:** Generated in an earlier step.                                      |
| `QUIRREL_API_URL`           | location that your Quirrel server is reachable under                    | You probably know this. Something like `my-quirrel-deployment.example.com`                                                                                                       |
| `QUIRREL_BASE_URL`          | The base URL of your application's deployment.                          | You probably know this. Something like `my-application.com`.                                                                                                                     |
| `QUIRREL_ENCRYPTION_SECRET` | A 32-character-long secret used for end-to-end encryption of your jobs. | Can be generated using `openssl rand -hex 16` or [random.org](https://www.random.org/strings/?num=2&len=16&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new). |

After setting these variables, you can deploy your application and Quirrel should be working.
If it doesn't, feel free to [reach out](mailto:troubleshooting@quirrel.dev).

:::note Cron Jobs
If you're using [CronJobs()](/api/cronjob), make sure to run `quirrel ci` during the deploy process.

```sh
> npm run build && quirrel ci
```
