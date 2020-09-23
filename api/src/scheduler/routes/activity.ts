import { FastifyPluginCallback } from "fastify";
import * as fastifyWebsocket from "fastify-websocket";

const activityPlugin: FastifyPluginCallback = async (fastify, _opts, done) => {
  fastify.register(fastifyWebsocket);

  fastify.get("/", { websocket: true }, async (connection, req) => {
    const [tokenId, done] = await fastify.tokenAuth.authenticate(req);

    if (done) {
      connection.socket.close();
      return;
    }
  });

  done();
};

export default activityPlugin;
