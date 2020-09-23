import { FastifyPluginCallback } from "fastify";
import * as fastifyWebsocket from "fastify-websocket";
import { JobsRepo } from "../jobs-repo";

const activityPlugin: FastifyPluginCallback = async (fastify, _opts, done) => {
  fastify.register(fastifyWebsocket);

  const jobsRepo = new JobsRepo(fastify.redis);

  fastify.get("/", { websocket: true }, async (connection, req) => {
    const [tokenId, done] = await fastify.tokenAuth.authenticate(req);

    if (done) {
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
