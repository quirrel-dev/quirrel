import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { PostHog } from "posthog-node";

declare module "fastify" {
  interface FastifyInstance {
    postHog?: PostHog;
  }
}

interface PostHogPluginOpts {
  apiKey: string;
}

const posthogPlugin: FastifyPluginCallback<PostHogPluginOpts> = async (
  fastify,
  opts
) => {
  const postHog = new PostHog(opts.apiKey, {
    host: "https://app.posthog.com",
  });

  fastify.decorate("postHog", postHog);

  fastify.addHook("onClose", () => {
    postHog.shutdown();
  });
};

export default (fp as any)(
  posthogPlugin
) as FastifyPluginCallback<PostHogPluginOpts>;
