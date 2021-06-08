import ddTrace from "dd-trace";
import * as opentracing from "opentracing";

module.exports = (serviceName: string = "quirrel") => {
  const tracer = ddTrace.init({
    enabled: process.env.DD_TRACE_ENABLED === "true",
    service: serviceName,
  });

  opentracing.initGlobalTracer(tracer);

  return tracer;
};
