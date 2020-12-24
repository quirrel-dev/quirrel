import type Owl from "@quirrel/owl";
import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { createOwl } from "../shared/owl";

declare module "fastify" {
  interface FastifyInstance {
    owl: Owl<"every" | "cron">;
  }
}

const owlPlugin: FastifyPluginCallback = (fastify, {}, done) => {
  const owl = createOwl(() => fastify.redisFactory());

  fastify.decorate("owl", owl);

  done();
};

export default (fp as any)(owlPlugin) as FastifyPluginCallback;
