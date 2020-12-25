---
title: Deploying
---

Deploying Quirrel is straight-forward.

There are three main environment variables you need to specify in your deployment settings:

| Variable                    | Meaning                                                                 | Where to get                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUIRREL_TOKEN`             | access token for the Quirrel server.                                    | Create a new Project + Client in the [Dashboard](https://quirrel.dev/dashboard).                                                                                                 |
| `QUIRREL_BASE_URL`          | The base URL of your deployment.                                        | You probably know this. Something like `my-application.com`.                                                                                                                     |
| `QUIRREL_ENCRYPTION_SECRET` | A 32-character-long secret used for end-to-end encryption of your jobs. | Can be generated using `openssl rand -hex 16` or [random.org](https://www.random.org/strings/?num=2&len=16&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new). |

After setting these variables, you can deploy your application and Quirrel should be working.
If it doesn't, feel free to [reach out](mailto:troubleshooting@quirrel.dev).

::: note
If you're on Vercel, you can connect `QUIRREL_BASE_URL` to your `VERCEL_URL`.
Only do this for preview environments, _not for production_!
`QUIRREL_BASE_URL` is used to determine the deployment that your jobs should be executed on.
If you set it to `VERCEL_URL`, that means all jobs will be executed on the exact deployment that they were
created on, excluding them from future bugfixes.
:::

## Using VERCEL_URL for QUIRREL_BASE_URL

## Hosted vs On-Prem

For most people, the [hosted version](https://quirrel.dev) of Quirrel is the easiest, and probably also cheapest way of using Quirrel (there's a free tier if your project is just starting out, and OSS and side projects can apply for discounts).

If you still want to host Quirrel yourself, you can do so using the [Docker Image](https://github.com/orgs/quirrel-dev/packages/container/package/quirrel).
This requires you to set the `QUIRREL_URL` variable to the location of your deployment (it defaults to `https://api.quirrel.dev`).
The `QUIRREL_TOKEN` can be obtained using the server's [REST API](https://api.quirrel.dev/documentation/index.html#/default/put_tokens__id_).
