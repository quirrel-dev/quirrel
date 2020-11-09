import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { Logger } from "../shared/logger";

declare module "fastify" {
  interface FastifyInstance {
    logger?: Logger;
  }
}

interface LoggerPluginOpts {
  logger?: Logger;
}

const loggerPlugin: FastifyPluginCallback<LoggerPluginOpts> = (
  fastify,
  { logger },
  done
) => {
  fastify.decorate("logger", logger);

  done();
};

export default (fp as any)(loggerPlugin) as FastifyPluginCallback<
  LoggerPluginOpts
>;
