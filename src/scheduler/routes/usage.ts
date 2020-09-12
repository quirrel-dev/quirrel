import { FastifyPluginCallback } from "fastify";
import * as uuid from "uuid";
import { UsageMeter } from "../../shared/usage-meter"

import * as DELETEUsageResponseSchema from "../schemas/usage/DELETE/response.json";
import { DELETEUsageResponse } from "../types/usage/DELETE/response";

const usagePlugin: FastifyPluginCallback<TokensPluginOpts> = async (
  fastify,
  opts,
  done
) => {
    const usageMeter = new UsageMeter(fastify.redis)

    fastify.addHook("onRequest", fastify.basicAuth);

    fastify.delete<{ Response: DELETEUsageResponse }>("/", {
        schema: {
            response: {
                data: DELETEUsageResponseSchema
            }
        },
        async handler(request, reply) {
            const usage = await usageMeter.readAndReset();
            reply.status(200).send(usage);
        }
    })
};

export default usagePlugin;
