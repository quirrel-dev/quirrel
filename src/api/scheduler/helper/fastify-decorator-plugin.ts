import { Closable } from "@quirrel/owl";
import { FastifyInstance, FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";

export function fastifyDecoratorPlugin(
  identifier: string,
  make: (fastify: FastifyInstance) => Closable
): FastifyPluginCallback {
  const plugin: FastifyPluginCallback = (fastify, _opts, done) => {
    const object = make(fastify);
    fastify.decorate(identifier, object);

    fastify.addHook("onClose", async () => {
      await object.close();
    });

    done();
  };

  return fp(plugin);
}
