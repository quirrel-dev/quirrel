import { FastifyPluginCallback } from "fastify";
import fastifyStatic from "fastify-static";
import * as path from "path";

const alternativeEntries = ["/cron", "/pending", "/activity-log"];

const index: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../../../../../ui"),
    wildcard: false,
    redirect: true,
  });

  alternativeEntries.forEach((entryPoint) => {
    fastify.get(entryPoint, async (request, reply) => {
      return reply.sendFile("index.html");
    });
  });

  done();
};

export default index;
