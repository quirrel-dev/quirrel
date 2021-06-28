---
title: Deploying
---

Deploying Quirrel is straight-forward.

There are three main environment variables you need to specify in your deployment settings:

| Variable                    | Meaning                                                                 | Where to get                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUIRREL_TOKEN`             | access token for the Quirrel server.                                    | **Hosted:** Create a new Project + Client in the [Dashboard](https://quirrel.dev/dashboard). **Self-Hosted:** Check [How to deploy our own server](#acquiring-a-token) .         |
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
Only do this for preview environments, \_not for production*!
`QUIRREL_BASE_URL` is used to determine the deployment that your jobs should be executed on.
If you set it to `VERCEL_URL`, that means all jobs will be executed on the exact deployment that they were
created on, excluding them from future bugfixes.
:::

## Hosted version

For most people, the [hosted version](https://quirrel.dev) of Quirrel is the easiest, and probably also cheapest way of using Quirrel (there's a free tier if your project is just starting out, and OSS and side projects can apply for discounts).

## How to deploy to your own server

If you still want to host Quirrel yourself, there are currently two ways to host our own quirrel server:

1. [By using the Docker Image](#using-the-docker-image).
2. [By launching our own instance](#launching-our-own-instance).

Both of them require that our connections are secured through a secured token.

### Deploying the server

**Please note that the deployment should be secured using HTTPS.**

#### Using the Docker Image

Quirrel's Docker Image can be found here: https://github.com/orgs/quirrel-dev/packages/container/package/quirrel

To use Quirrel's Docker Image, we need to set the connection string at
`REDIS_URL`. **Make sure your Redis instance is persistent**.

Also, we'll need to set a `PASSPHRASE` (or more, separated by colons `:`) that will be used in the next step to generate a token. You can do so by setting the environment variable:

```
PASSPHRASES=PASSPHRASE1[:PASSPHRASE2[:PASSPHRASE3]]
```

#### Launching our own instance

First, we will fire up our server with a `PASSPHRASE` (or more, separated by colons `:`) that will be used in the next step to generate a token. To do so, launch quirrel like so:

```
quirrel --passphrase PASSPHRASE1[:PASSPHRASE2[:PASSPHRASE3]]
```

### Acquiring a token

Once our server is ready, we'll need to [get an auth token](https://api.quirrel.dev/documentation/static/index.html#/Admin/put_tokens__id_):

`curl --user ignored:{PASSPHRASE} -X PUT {QUIRREL_SERVER_URL}/tokens/{NAME_OF_TOKEN}`

This petition will return a token. Save it for the next and last step.

### Configuring our client to auth connections with our token

Lastly, we should configure our client to use the newly generated **token** as well as provide quirrel with our own client's base url. To do so, add the following environment variables to your client:

```
# example ./.env file in the client's root directory

QUIRREL_API_URL=http://your-quirrel-api-address:9181
# Token generated in the previous step
QUIRREL_TOKEN=<token-generated-in-previous-step>
```
