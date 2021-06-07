import tracer from "dd-trace";

module.exports = (serviceName: string = "quirrel") => {
  return tracer.init({
    enabled: process.env.DD_TRACE_ENABLED === "true",
    service: serviceName,
  });
};
