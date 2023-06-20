# Docker

Deploying Quirrel in a Docker environment is straightforward and easy. Here are detailed steps including the necessary environment variables, how to build your Docker image and run your Quirrel instance using Docker.

## Docker Deployment

Deploy Quirrel using the official Docker image provided by Quirrel: [Quirrel Docker Image](https://github.com/orgs/quirrel-dev/packages/container/package/quirrel)

1. Pull the official Quirrel Docker image:

```bash
docker pull ghcr.io/quirrel-dev/quirrel:main
```

2. Define your environment variables in a `.env` file:

```env
REDIS_URL=your_redis_url
PASSPHRASES=your_passphrases
REDIS_TLS_CA_BASE64=your_base64_encoded_certificate # if applicable
REDIS_TLS_CA_FILE=your_certificate_file_path # if applicable
```

3. Run the Docker container, replace `<name_of_your_container>` with your preferred container name:

```bash
docker run --env-file .env -p 9181:9181 --name <name_of_your_container> ghcr.io/quirrel-dev/quirrel:main
```

This command will start a new Docker container and expose it on port 9181.

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
| `QUIRREL_TOKEN`             | Access token for the Quirrel server                               | Create a new Project + Client in the [Quirrel Dashboard](https://quirrel.dev/dashboard)                                                                                    |
| `QUIRREL_BASE_URL`          | The base URL of your application's deployment                     | Something like `my-application.com`                                                                                                                                        |
| `QUIRREL_ENCRYPTION_SECRET` | A 32-character-long secret for end-to-end encryption of your jobs | Generate it using `openssl rand -hex 16` or [random.org](https://www.random.org/strings/?num=2&len=16&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new) |
| `QUIRREL_API_URL`           | The URL for your Quirrel API endpoint                             | The URL of your Quirrel Docker deployment, usually `http://your-quirrel-api-address:9181`                                                                                  |

## Scripts

If you're using [CronJobs](/api/cronjob), ensure to run `quirrel ci` during the Docker build process. You can include this in your Dockerfile:

```Dockerfile
RUN npm run build && quirrel ci
```

## Conclusion

With these settings, you can easily deploy your application with Quirrel in a Docker environment. If you encounter any issues, feel free to reach out to [troubleshooting@quirrel.dev](mailto:troubleshooting@quirrel.dev).
