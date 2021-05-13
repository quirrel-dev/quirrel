import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { TokenRepo } from "../shared/token-repo";

declare module "fastify" {
  interface FastifyInstance {
    tokens?: TokenRepo;
  }
}

const tokensPlugin: FastifyPluginCallback = async (fastify) => {
  const tokenRepo = new TokenRepo(fastify.redis);

  fastify.decorate("tokens", tokenRepo);
};

export default (fp as any)(tokensPlugin) as FastifyPluginCallback;
