import fastify from "fastify";
import redisPlugin from "./redis";
import tokensPlugin from "./tokens";
import tokensRoute from "./routes/tokens";
import health from "./routes/health";
import queues from "./routes/queues";
import usageRoute from "./routes/usage";
import * as oas from "fastify-oas";
import * as pack from "../../package.json";
import basicAuthPlugin from "./basic-auth";
import type { RedisOptions } from "ioredis";
import type { AddressInfo } from "net";
import tokenAuthPlugin from "./token-auth";
import activityPlugin from "./routes/activity";
import blipp from "fastify-blipp";
import cors from "fastify-cors";
import telemetry from "./telemetry";
import sentryPlugin from "./sentry";

export interface QuirrelServerConfig {
  port?: number;
  host?: string;
  redis?: RedisOptions | string;
  passphrases?: string[];
  runningInDocker?: boolean;
  disableTelemetry?: boolean;
}

export async function createServer({
  port = 9181,
  host = "0.0.0.0",
  runningInDocker = false,
  redis,
  passphrases,
  disableTelemetry,
}: QuirrelServerConfig) {
  const app = fastify({
    logger: true,
  });

  if (!disableTelemetry) {
    app.register(sentryPlugin);
  }

  app.register(blipp);

  app.register(cors, {
    origin: "*",
  });

  app.register(oas, {
    routePrefix: "/documentation",
    swagger: {
      info: {
        title: "Quirrel API",
        description: "The Queueing Solution for Next.js x Vercel",
        version: pack.version,
      },
      externalDocs: {
        url: "https://quirrel.dev",
        description: "Find more info here",
      },
      consumes: ["application/json"],
      produces: ["application/json"],
    },
    exposeRoute: true,
  });

  const enableAuth = !!passphrases?.length;

  app.register(redisPlugin, { opts: redis });

  app.register(tokenAuthPlugin, { auth: enableAuth });

  if (!disableTelemetry) {
    app.register(telemetry, { runningInDocker });
  }

  if (passphrases) {
    app.register(basicAuthPlugin, { passphrases });
    app.register(tokensPlugin);
    app.register(tokensRoute, { prefix: "/tokens" });
    app.register(usageRoute, { prefix: "/usage" });
  }

  app.register(health, { prefix: "/health" });
  app.register(queues, { prefix: "/queues" });
  app.register(activityPlugin, { prefix: "/activity" });

  app.ready(async () => {
    const debug = false;
    if (debug) {
      app.blipp();
    }

    await app.oas();

    app.telemetrist?.dispatch("ready");

    if (passphrases) {
      app.telemetrist?.dispatch("auth enabled");
    }

    if (port !== 9181) {
      app.telemetrist?.dispatch("custom port");
    }
  });

  await app.listen(port, host);

  return {
    server: app.server,
    port: (app.server.address() as AddressInfo).port,
    async close() {
      app.log.info("Closing.");
      await app.close();
    },
  };
}
