import ddTrace from "dd-trace";
import * as opentracing from "opentracing";
import pack from "../../../package.json";

module.exports = (serviceName: string = "quirrel") => {
  const tracer = ddTrace.init({
    enabled: process.env.DD_TRACE_ENABLED === "true",
    service: serviceName,
    version: process.env.HEROKU_SLUG_COMMIT ?? pack.version,
  });

  opentracing.initGlobalTracer(tracer);

  return tracer;
};
