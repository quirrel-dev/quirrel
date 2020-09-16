import { FastifyPluginCallback } from "fastify";
import { Queue, QueueScheduler } from "bullmq";

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

  const jobsScheduler = new QueueScheduler(HTTP_JOB_QUEUE, {
    connection: app.redis,
  });
  const jobs = new Queue<HttpJob>(HTTP_JOB_QUEUE, {
    connection: app.redis,
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
      
      let { endpoint, body, runAt, delay } = request.body;

      if (runAt) {
        delay = Number(new Date(runAt)) - Date.now();
      }

      await jobs.add(
        "default",
        {
          endpoint,
          body,
          tokenId,
        },
        {
          delay,
        }
      );

      reply.status(200);
      reply.send("OK");
    },
  });

  app.addHook("onClose", async (instance, done) => {
    await Promise.all([jobs.close(), jobsScheduler.close()]);
    done();
  });

  done();
};

export default jobs;
