import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";

import * as EndpointParamsSchema from "../schemas/queues/endpoint-params.json";
import * as EndpointJobIDParamsSchema from "../schemas/queues/endpoint-jobid-params.json";
import * as POSTQueuesEndpointBodySchema from "../schemas/queues/POST/body.json";
import { POSTQueuesEndpointBody } from "../types/queues/POST/body";

import { JobsRepo } from "../jobs-repo";
import { QueuesEndpointParams } from "../types/queues/endpoint-params";
import { QueuesEndpointIdParams } from "../types/queues/endpoint-jobid-params";

interface JobsPluginOpts {
  auth: boolean;
}

const jobs: FastifyPluginCallback<JobsPluginOpts> = (app, opts, done) => {
  async function getTokenID(authorizationHeader?: string) {
    if (!authorizationHeader) {
      return undefined;
    }

    if (!authorizationHeader.startsWith("Bearer ")) {
      return undefined;
    }

    const [_, token] = authorizationHeader.split("Bearer ");
    const tokenId = await app.tokens.check(token);
    return tokenId ?? undefined;
  }

  const jobsRepo = new JobsRepo(app.redis);

  async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<[tokenId: string, done: boolean]> {
    if (opts.auth) {
      const { authorization } = request.headers;
      const tokenId = await getTokenID(authorization);

      if (!tokenId) {
        reply.status(401).send("Unauthorized");
        return ["unauthorized", true];
      }

      return [tokenId, false];
    }

    return ["anonymous", false];
  }

  app.post<{ Body: POSTQueuesEndpointBody; Params: QueuesEndpointParams }>(
    "/:endpoint",
    {
      schema: {
        body: {
          data: POSTQueuesEndpointBodySchema,
        },
        params: {
          data: EndpointParamsSchema,
        },
      },

      async handler(request, reply) {
        const [tokenId, done] = await authenticate(request, reply);
        if (done) {
          return;
        }

        const job = await jobsRepo.enqueue(
          tokenId,
          request.params.endpoint,
          request.body
        );

        reply.status(201).send(job);
      },
    }
  );

  app.get<{ Params: QueuesEndpointParams }>("/:endpoint", {
    schema: {
      params: {
        data: EndpointParamsSchema,
      },
    },
    async handler(request, reply) {
      const [tokenId, done] = await authenticate(request, reply);
      if (done) {
        return;
      }

      const { cursor, jobs } = await jobsRepo.find(
        tokenId,
        request.params.endpoint
      );

      reply.status(200).send({
        cursor,
        jobs,
      });
    },
  });

  app.get<{ Params: QueuesEndpointIdParams }>("/:endpoint/:id", {
    schema: {
      params: {
        data: EndpointJobIDParamsSchema,
      },
    },

    async handler(request, reply) {
      const [tokenId, done] = await authenticate(request, reply);
      if (done) {
        return;
      }

      const { endpoint, id } = request.params;

      const job = await jobsRepo.findById(tokenId, endpoint, id);
      if (job) {
        reply.status(200).send(job);
      } else {
        reply.status(404).send("Not Found");
      }
    },
  });

  app.delete<{ Params: QueuesEndpointIdParams }>("/:endpoint/:id", {
    schema: {
      params: {
        data: EndpointJobIDParamsSchema,
      },
    },

    async handler(request, reply) {
      const [tokenId, done] = await authenticate(request, reply);
      if (done) {
        return;
      }

      const { endpoint, id } = request.params;

      const deletedJob = await jobsRepo.delete(tokenId, endpoint, id);

      if (deletedJob) {
        reply.status(200).send(deletedJob);
      } else {
        reply.status(404).send("Not Found");
      }
    },
  });

  app.addHook("onClose", async () => {
    await jobsRepo.close();
  });

  done();
};

export default jobs;
