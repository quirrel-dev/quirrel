import { FastifyPluginCallback } from "fastify";
import * as Sentry from "@sentry/node";
import * as fp from "fastify-plugin";
import * as pack from "../../package.json";

interface SentryPluginOptions {}

const sentryPlugin: FastifyPluginCallback<SentryPluginOptions> = (
  fastify,
  opts,
  done
) => {
  Sentry.init({
    dsn:
      "https://3f2af43f2e7d423b9c258ba4373e8be2@o462664.ingest.sentry.io/5466383",
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    release: pack.version
  });

  fastify.setErrorHandler((err, request, reply) => {
    Sentry.withScope((scope) => {
      scope.setUser({
        ip_address: request.ip,
        id: request.tokenId,
      });

      scope.setTag("path", request.raw.url!);

      const exceptionId = Sentry.captureException(err, scope);

      reply.status(500).send({
        error: 500,
        message: "Internal Server Error",
        sentry: exceptionId,
      });
    });
  });

  done();
};

export default (fp as any)(sentryPlugin) as FastifyPluginCallback<
  SentryPluginOptions
>;
