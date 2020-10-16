import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin";
import { Telemetrist } from "../shared/telemetrist";

declare module "fastify" {
  interface FastifyInstance {
    telemetrist: Telemetrist;
  }
}

interface TelemetryPluginOptions {
    runningInDocker: boolean;
}

const telemetryPlugin: FastifyPluginCallback<TelemetryPluginOptions> = async (fastify, opts, done) => {
  const telemetrist = new Telemetrist(opts.runningInDocker);

  fastify.decorate("telemetrist", telemetrist);

  done();
};

export default (fp as any)(telemetryPlugin) as FastifyPluginCallback<TelemetryPluginOptions>;
