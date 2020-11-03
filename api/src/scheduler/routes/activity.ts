import { FastifyPluginCallback } from "fastify";
import fastifyWebsocket from "fastify-websocket";
import { JobsRepo } from "../jobs-repo";

const activityPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.register(fastifyWebsocket);

  const jobsRepo = new JobsRepo(fastify.redisFactory);

  fastify.get("/", { websocket: true }, async (connection, req) => {
    const tokenId = await fastify.tokenAuth.authenticate(req);

    if (!tokenId) {
      connection.socket.close();
      return;
    }

    const close = jobsRepo.onEvent(tokenId, (event, job) => {
      connection.socket.send(JSON.stringify([event, job]));
    });

    connection.on("close", close);
  });

  fastify.addHook("onClose", async () => {
    await jobsRepo.close();
  });

  done();
};

export default activityPlugin;
