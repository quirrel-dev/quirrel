import { FastifyPluginCallback } from "fastify";
import * as fp from "fastify-plugin";
import { TokenRepo } from "../shared/token-repo";

declare module "fastify" {
  interface FastifyInstance {
    tokens: TokenRepo;
  }
}

const tokensPlugin: FastifyPluginCallback = async (fastify, opts, done) => {
  const tokenRepo = new TokenRepo(fastify.redis);

  fastify.decorate("tokens", tokenRepo);

  done();
};

export default (fp as any)(tokensPlugin);
