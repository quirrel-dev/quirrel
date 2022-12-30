import { tracer } from "dd-trace";
import * as opentracing from "opentracing";
import { env } from "process"

module.exports = (serviceName: string = "quirrel"): void => {
  if (process.env.DD_TRACE_ENABLED !== "true") {
    return
  }

  const t = tracer.init({
    service: serviceName,
    version: process.env.HEROKU_SLUG_COMMIT ?? env.npm_package_version,
  });

  opentracing.initGlobalTracer(t);
};
