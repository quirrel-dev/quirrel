import fastify from "fastify";
import { Redis } from "ioredis";
import owlPlugin from "./owl";
import redisPlugin from "./redis";
import tokensPlugin from "./tokens";
import tokensRoute from "./routes/tokens";
import health from "./routes/health";
import queues from "./routes/queues";
import usageRoute from "./routes/usage";
import swagger from "fastify-swagger";
import pack from "../../../package.json";
import basicAuthPlugin from "./basic-auth";
import type { AddressInfo } from "net";
import tokenAuthPlugin from "./token-auth";
import activityPlugin from "./routes/activity";
import blipp from "fastify-blipp";
import cors from "fastify-cors";
import telemetry from "./telemetry";
import sentryPlugin from "./sentry";
import loggerPlugin from "./logger";
import indexRoute from "./routes/index";
import { StructuredLogger } from "../shared/structured-logger";
import { Logger } from "../shared/logger";

export interface QuirrelServerConfig {
  redisFactory: () => Redis;
  port?: number;
  host?: string;
  passphrases?: string[];
  runningInDocker?: boolean;
  disableTelemetry?: boolean;
  logger?: Logger;
}

declare module "fastify" {
  interface FastifyInstance {
    authEnabled: boolean;
  }
}

export async function createServer({
  port = 9181,
  host = "0.0.0.0",
  runningInDocker = false,
  redisFactory,
  passphrases,
  disableTelemetry,
  logger,
}: QuirrelServerConfig) {
  const app = fastify({
    logger: logger instanceof StructuredLogger ? logger.pino : undefined,
  });

  if (!disableTelemetry) {
    app.register(sentryPlugin);
  }

  app.register(blipp);

  app.register(cors, {
    origin: "*",
  });

  const enableAuth = !!passphrases?.length;

  app.decorate("authEnabled", enableAuth);

  app.register(swagger, {
    routePrefix: "/documentation",
    openapi: {
      info: {
        title: "Quirrel API",
        description: "The Queueing Solution for Serverless.",
        version: pack.version,
        contact: {
          email: "info@quirrel.dev",
          name: "Quirrel",
          url: "https://quirrel.dev",
        },
        license: {
          name: "MIT License",
          url: "https://github.com/quirrel-dev/quirrel/blob/main/LICENSE",
        },
      },
      externalDocs: {
        url: "https://docs.quirrel.dev",
        description: "Find general documentation here",
      },
      components: {
        securitySchemes: enableAuth
          ? {
              Token: {
                type: "http",
                scheme: "bearer",
                description: "Main auth scheme. Tokens are issued by admin.",
              },
              Admin: {
                type: "http",
                scheme: "basic",
                description:
                  "Used for admin tasks like issuing new tokens. Username is ignored, password is specified via environment variables.",
              },
              Impersonation: {
                type: "http",
                scheme: "basic",
                description:
                  "Username must be the token ID to be impersonated, password is admin password.",
              },
            }
          : undefined,
      },
      tags: [
        {
          name: "Queueing",
        },
        {
          name: "DX",
        },
        {
          name: "Admin",
        },
      ],
    },
    exposeRoute: true,
  });

  app.register(loggerPlugin, {
    logger,
  });

  app.register(redisPlugin, { redisFactory });
  app.register(owlPlugin);

  app.register(tokenAuthPlugin, {
    auth: enableAuth,
    passphrases: passphrases ?? [],
  });

  if (!disableTelemetry) {
    app.register(telemetry, { runningInDocker });
  }

  if (passphrases) {
    app.register(basicAuthPlugin, { passphrases });
    app.register(tokensPlugin);
    app.register(tokensRoute, { prefix: "/tokens" });
    app.register(usageRoute, { prefix: "/usage" });
  }

  app.register(indexRoute);
  app.register(health, { prefix: "/health" });
  app.register(queues, { prefix: "/queues" });
  app.register(activityPlugin, { prefix: "/activity" });

  app.ready(async () => {
    const debug = false;
    if (debug) {
      app.blipp();
    }

    app.swagger();

    app.telemetrist?.dispatch("ready");

    if (passphrases) {
      app.telemetrist?.dispatch("auth enabled");
    }

    if (port !== 9181) {
      app.telemetrist?.dispatch("custom port");
    }
  });

  await app.listen(port, host);

  const { address, port: runningPort } = app.server.address() as AddressInfo;

  logger?.started(`${address}:${runningPort}`, !disableTelemetry);

  return {
    server: app.server,
    app,
    port,
    async close() {
      app.log.info("Closing.");
      await app.close();
    },
  };
}
