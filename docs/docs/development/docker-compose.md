import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Docker Compose

Quirrel can be run using Docker and Docker Compose, making it easy to start up and run. This guide will show you how to set up and run Quirrel using a Docker Compose configuration.

## Prerequisites

Make sure you have installed the following on your system:

- Docker
- Docker Compose

You can download Docker [here](https://docs.docker.com/get-docker/) and Docker Compose [here](https://docs.docker.com/compose/install/).

## Setup

Firstly, you should create a Docker Compose file. This file will define your services, which are Quirrel and Redis in this case. Here's an example Docker Compose file:

```yaml
version: "3.7"
services:
  redis:
    container_name: "redis"
    image: redis:latest
    volumes:
      - redis_volume:/var/lib/redisdb/data
    ports:
      - 6379:6379

  quirrel:
    container_name: "quirrel"
    image: ghcr.io/quirrel-dev/quirrel:sha-a48280e
    environment:
      - REDIS_URL='redis://redis'
      - PASSPHRASES='<your-phrase>'
    ports:
      - "9181:9181"

volumes:
  redis_volume:
```

You should replace `<your-phrase>` with your own passphrase.

## Running the Services

Once you have created your Docker Compose file, you can run the services with the following command:

```bash
docker-compose up -d
```

The `-d` flag will run the services in the background.

To view the logs of the services, you can use the following command:

```bash
docker-compose logs
```

To stop the services, you can use the following command:

```bash
docker-compose down
```

## Token Acquisition

Once your server is ready, [acquire an auth token](https://api.quirrel.dev/documentation/static/index.html#/Admin/put_tokens__id_):

```bash
curl --user ignored:{PASSPHRASE} -X PUT {QUIRREL_SERVER_URL}/tokens/{NAME_OF_TOKEN}
```

Replace `{}` placeholders with your actual values. Save the returned token for the next step.

## Connecting Your Application to the Quirrel Deployment

Configure your application to connect to your Quirrel deployment by specifying the following two environment variables:

### Environment Variables

These are the necessary environment variables for your Docker deployment:

| Variable                    | Meaning                                                           | Where to Get It                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUIRREL_TOKEN`             | Access token for the Quirrel server                               | The one we created in the [last step](#token-acquisition).                                                                                                                 |
| `QUIRREL_BASE_URL`          | The base URL of your application's deployment                     | Something like `http://localhost:${post}`                                                                                                                                  |
| `QUIRREL_ENCRYPTION_SECRET` | A 32-character-long secret for end-to-end encryption of your jobs | Generate it using `openssl rand -hex 16` or [random.org](https://www.random.org/strings/?num=2&len=16&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new) |
| `QUIRREL_API_URL`           | The URL for your Quirrel API endpoint                             | The URL of your Quirrel docker-compose deployment, usually `http://localhost:9181`                                                                                         |

### Scripts

If you're using [CronJobs](/api/cronjob), ensure to run `quirrel ci` during the Docker build process but since we are running the ci in development, we need to inject the environment variables we just set to the execution context.
We do that by installing `dotenv-cli` as a dev dependency in out project:

<Tabs>

<TabItem value="pnpm" label="pnpm">

```bash
pnpm install -D dotenv-cli
```

</TabItem>
<TabItem value="yarn" label="yarn">

```bash
yarn add -D dotenv-cli
```

</TabItem>
<TabItem value="npm" label="npm">

```bash
npm install -D dotenv-cli
```

</TabItem>
</Tabs>

Then we can add the `quirrel ci` command to our dev run script:

```json
{
  "scripts": {
    "dev": "dotenv -e .env quirrel ci && next dev"
  }
}
```

## Accessing Quirrel

Once your services are running, you can access Quirrel through the defined port (9181 in this case). You can navigate to `http://localhost:9181` in your web browser to access the Quirrel dashboard.
