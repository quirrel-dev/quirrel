import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";

import * as DELETEJobsParamsSchema from "../schemas/jobs/DELETE/params.json";
import { DELETEJobsIdParams } from "../types/jobs/DELETE/params";
import * as POSTJobsBodySchema from "../schemas/jobs/POST/body.json";
import { POSTJobsBody } from "../types/jobs/POST/body";

import { JobsRepo } from "../jobs-repo";

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

  app.post<{ Body: POSTJobsBody }>("/", {
    schema: {
      body: {
        data: POSTJobsBodySchema,
      },
    },

    async handler(request, reply) {
      const [tokenId, done] = await authenticate(request, reply);
      if (done) {
        return;
      }

      const job = await jobsRepo.enqueue(tokenId, request.body);

      reply.status(201).send(job);
    },
  });

  app.get("/", {
    async handler(request, reply) {
      const [tokenId, done] = await authenticate(request, reply);
      if (done) {
        return;
      }

      const { cursor, jobs } = await jobsRepo.find(tokenId);

      reply.status(200).send({
        cursor,
        jobs,
      });
    },
  });

  app.get<{ Params: DELETEJobsIdParams }>("/:id", {
    schema: {
      params: {
        data: DELETEJobsParamsSchema,
      },
    },

    async handler(request, reply) {
      const [tokenId, done] = await authenticate(request, reply);
      if (done) {
        return;
      }

      const { url = "" } = request.raw;

      const externalId = url.slice(url.lastIndexOf("/") + 1);

      const job = await jobsRepo.findById(tokenId, externalId);
      if (job) {
        reply.status(200).send(job);
      } else {
        reply.status(404).send("Not Found");
      }
    },
  });

  app.delete<{ Params: DELETEJobsIdParams }>("/:id", {
    schema: {
      params: {
        data: DELETEJobsParamsSchema,
      },
    },

    async handler(request, reply) {
      const [tokenId, done] = await authenticate(request, reply);
      if (done) {
        return;
      }

      const { url = "" } = request.raw;

      const externalId = url.slice(url.lastIndexOf("/") + 1);

      const deletedJob = await jobsRepo.delete(tokenId, externalId);

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
