# Vercel

Deploying your Quirrel powered application on Vercel is an easy process. There are a few environment variables you need to configure, and possibly an additional script depending on your use case.

## Environment Variables

Configure the following environment variables for your Vercel deployment:

| Variable                    | Meaning                                                           | Where to Get It                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUIRREL_TOKEN`             | Access token for the Quirrel server                               | Create a new Project + Client in the [Quirrel Dashboard](https://quirrel.dev/dashboard)                                                                                                                                      |
| `QUIRREL_BASE_URL`          | The base URL of your application's deployment                     | Something like `my-application.com`, you can set `QUIRREL_BASE_URL` to your `VERCEL_URL` for preview environments only. Do not do this for production. Set the value of `QUIRREL_BASE_URL` to `@VERCEL_URL` to achieve this. |
| `QUIRREL_ENCRYPTION_SECRET` | A 32-character-long secret for end-to-end encryption of your jobs | Generate it using `openssl rand -hex 16` or [random.org](https://www.random.org/strings/?num=2&len=16&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new)                                                   |
| `QUIRREL_API_URL`           | The URL for your Quirrel API endpoint                             | The URL of your hosted Quirrel server, usually `http://your-quirrel-api-address:9181`                                                                                                                                        |

## Scripts

If you are using [CronJobs](/api/cronjob), ensure to run `quirrel ci` during the deploy process. Configure the `vercel-build` command in your `package.json` file:

```json
"scripts": { "vercel-build": "npm run build && quirrel ci" }
```

## Conclusion

By configuring these settings, you can easily deploy your application with Quirrel on Vercel. If you encounter any issues, feel free to reach out to [troubleshooting@quirrel.dev](mailto:troubleshooting@quirrel.dev).
