import fastify from "fastify";
import { Redis } from "ioredis";
import owlPlugin from "./owl";
import redisPlugin from "./redis";
import tokensRoute from "./routes/tokens";
import tokensRepoPlugin from "./tokens";
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
  jwtPublicKey?: string;
  runningInDocker?: boolean;
  disableTelemetry?: boolean;
  logger?: Logger;
}

declare module "fastify" {
  interface FastifyInstance {
    adminBasedAuthEnabled: boolean;
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
  jwtPublicKey,
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

  const enableAdminBasedAuth = !!passphrases?.length;

  app.decorate("adminBasedAuthEnabled", enableAdminBasedAuth);

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
        securitySchemes: {
          Token:
            enableAdminBasedAuth || jwtPublicKey
              ? {
                  type: "http",
                  scheme: "bearer",
                  description: `Main auth scheme. Tokens can be issued via ${
                    enableAdminBasedAuth
                      ? jwtPublicKey
                        ? "JWT / Admin"
                        : "Admin"
                      : "JWT"
                  }.`,
                }
              : undefined,
          Admin: enableAdminBasedAuth
            ? {
                type: "http",
                scheme: "basic",
                description:
                  "Used for admin tasks like issuing new tokens. Username is ignored, password is specified via environment variables.",
              }
            : undefined,
          Impersonation: enableAdminBasedAuth
            ? {
                type: "http",
                scheme: "basic",
                description:
                  "Username must be the token ID to be impersonated, password is admin password.",
              }
            : undefined,
        } as any,
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
    enable: enableAdminBasedAuth,
    passphrases: passphrases ?? [],
    jwtPublicKey,
  });

  if (!disableTelemetry) {
    app.register(telemetry, { runningInDocker });
  }

  if (passphrases) {
    app.register(basicAuthPlugin, { passphrases });
    app.register(usageRoute, { prefix: "/usage" });

    if (!jwtPublicKey) {
      app.register(tokensRepoPlugin);
      app.register(tokensRoute, { prefix: "/tokens" });
    }
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
