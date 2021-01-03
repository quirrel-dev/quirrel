import type crossFetch from "cross-fetch";
import type { FastifyInstance } from "fastify";

export function makeFetchMockConnectedTo(
  fastify: FastifyInstance
): typeof crossFetch {
  return async (url, conf) => {
    const [, , , , path] = /(http:\/\/)(.*?)(:\d+)?(\/.*)/.exec(url as string)!;

    const response = await fastify.inject({
      method: conf?.method as any,
      headers: conf?.headers as any,
      payload: conf?.body as any,
      path,
    });

    return {
      status: response.statusCode,
      statusText: response.statusMessage,
      text: async () => response.payload,
      json: async () => response.json(),
    } as any;
  };
}
