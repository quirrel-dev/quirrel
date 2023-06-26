---
title: Migrating Instances
---

# Migrating between one Quirrel Servers

This guide walks you through a zero-downtime-migration from one Quirrel instance to another.
It works by connecting your application to both the old and new instance at the same time.
Both instances will continue sending their jobs to the application, but new jobs are only created on one of them.
This will result in the old instance slowly draining.
Once it's fully drained, the migration is complete.

:::warning
During the migration, the `exclusive` jobs feature will not work perfectly.
If that's a problem for your application, [get in touch](mailto:migration@quirrel.dev).
:::

Here's the step-by-step guide:

1. Upgrade your application to Quirrel v1.9.1
2. Deploy your own Instance by following [https://github.com/quirrel-dev/quirrel-on-railway](https://github.com/quirrel-dev/quirrel-on-railway) or [https://docs.quirrel.dev/deployment/connecting](https://docs.quirrel.dev/deployment/connecting). Note down the access token.
3. Make the following changes to your application's environment variables:
    - set `QUIRREL_MIGRATE_OLD_API_URL` to the hostname of your old instance. If you used hosted Quirrel, that's `api.quirrel.dev`.
    - set `QUIRREL_MIGRATE_OLD_TOKEN` to the token that previously was set for `QUIRREL_TOKEN`
    - set `QUIRREL_API_URL` to the hostname of your new Quirrel deployment
    - set `QUIRREL_TOKEN` to the token generated in step 2
  
  Your application will now start draining the old instance, new jobs will always be created on the new deployment.
  Cron Jobs are transferred on the first run of `quirrel ci`.

4. Use the `Stats` page on [https://ui.quirrel.dev](https://ui.quirrel.dev/) to watch the old instance drain fully. Depending on your application, this can take weeks.
5. After the old instance is fully drained, remove the `QUIRREL_MIGRATE_*` environment variables.

If you face an issue, please [open an issue](https://github.com/quirrel-dev/quirrel/issues/new/choose) on GitHub or [email Simon](mailto:migration@quirrel.dev).