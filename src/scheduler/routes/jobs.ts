import { FastifyPluginCallback } from "fastify";
import * as Queue from "bee-queue";

import * as POSTJobsBodySchema from "../schemas/jobs/POST/body.json";
import { POSTJobsBody } from "../types/jobs/POST/body";
import { HttpJob, HTTP_JOB_QUEUE } from "../../shared/http-job";

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

  const jobs = new Queue(HTTP_JOB_QUEUE, {
    redis: app.redis as any,
    isWorker: false,
    getEvents: false,
    sendEvents: false,
    storeJobs: false,
    activateDelayedJobs: true,
  });

  app.post<{ Body: POSTJobsBody }>("/", {
    schema: {
      body: {
        data: POSTJobsBodySchema,
      },
    },

    async handler(request, reply) {
      let tokenId: string | undefined;

      if (opts.auth) {
        const { authorization } = request.headers;
        tokenId = await getTokenID(authorization);

        if (!tokenId) {
          reply.status(401).send("Unauthorized");
          return;
        }
      }
      const { endpoint, body, runAt } = request.body;

      let job = jobs.createJob<HttpJob>({ endpoint, body, tokenId });

      if (runAt) {
        job = job.delayUntil(new Date(runAt));
      }

      await job.save();

      reply.status(200);
      reply.send("OK");
    },
  });

  app.addHook("onClose", async (instance, done) => {
    await jobs.close();
    done();
  });

  done();
};

export default jobs;
