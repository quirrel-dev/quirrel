import { FastifyPluginCallback } from "fastify";
import { UsageMeter } from "../../shared/usage-meter.js";

import { DELETEUsageResponse } from "../types/usage/DELETE/response.js";

import { readFileSync } from "fs"
import { join } from "path"

const DELETEUsageResponseSchema = JSON.parse(
  readFileSync(join(import.meta.url, "..", "..","schemas","usage","DELETE","response.json"), "utf-8")
)

const usageRoute: FastifyPluginCallback = (fastify, opts, done) => {
  const usageMeter = new UsageMeter(fastify.redis);

  fastify.addHook("onRequest", fastify.basicAuth);

  fastify.delete<{ Reply: DELETEUsageResponse }>("/", {
    schema: {
      response: {
        200: DELETEUsageResponseSchema,
      },
      tags: ["Admin"],
      summary: "Fetch & reset usage statistics",
      security: [
        {
          "Admin": []
        }
      ]
    },
    async handler(request, reply) {
      const usage = await usageMeter.readAndReset();
      reply.status(200).send(usage);
    },
  });

  done();
};

export default usageRoute;
