import type { FastifyPluginCallback, FastifyRequest } from "fastify";
import fastifyWebsocket from "@fastify/websocket";

// https://stackoverflow.com/questions/4361173/http-headers-in-websockets-client-api
function workAroundWebsocketAuth(req: FastifyRequest) {
  const authToken = req.headers["sec-websocket-protocol"];
  if (!req.headers.authorization) {
    req.headers.authorization = `Bearer ${authToken}`;
  }
}

const activityPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.register(fastifyWebsocket);

  fastify.register(async (fastify) => {
    fastify.get(
      "/",
      {
        websocket: true,
        schema: {
          tags: ["DX"],
          summary: "Activity feed, published as websocket",
          description: "Token is passed via Websocket protocol.",
          security: fastify.adminBasedAuthEnabled
            ? [
                {
                  Admin: [],
                  Impersonation: [],
                },
              ]
            : undefined,
        },
      },
      async (connection, req) => {
        workAroundWebsocketAuth(req);

        const tokenId = await fastify.tokenAuth.authenticate(req);

        if (!tokenId) {
          connection.socket.close();
          return;
        }

        const close = fastify.jobs.onEvent(tokenId, (event, job) => {
          connection.socket.send(JSON.stringify([event, job]));
        });

        connection.on("close", close);
      }
    );
  });

  done();
};

export default activityPlugin;
