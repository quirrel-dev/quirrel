import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { Job, Queue, QueueScheduler } from "bullmq";

import * as DELETEJobsParamsSchema from "../schemas/jobs/DELETE/params.json";
import { DELETEJobsIdParams } from "../types/jobs/DELETE/params";
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

  async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<[tokenId: string | undefined, done: boolean]> {
    if (opts.auth) {
      const { authorization } = request.headers;
      const tokenId = await getTokenID(authorization);

      if (!tokenId) {
        reply.status(401).send("Unauthorized");
        return [undefined, true];
      }

      return [tokenId, false];
    }

    return [undefined, false];
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

      let { endpoint, body, runAt, delay, jobId } = request.body;

      if (runAt) {
        delay = Number(new Date(runAt)) - Date.now();
      }

      const job: Job<HttpJob> = await jobs.add(
        "default",
        {
          endpoint,
          body,
          tokenId,
        },
        {
          delay,
          jobId,
        }
      );

      reply.status(200);
      reply.send({
        jobId: job.id,
      });
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

      let { id } = request.params;

      const job: Job<HttpJob> | undefined = await jobs.getJob(id);
      if (job && job.data.tokenId === tokenId) {
        await job.remove();
        reply.status(204);
      } else {
        reply.status(404);
      }
    },
  });

  app.addHook("onClose", async (instance, done) => {
    await Promise.all([jobs.close(), jobsScheduler.close()]);
    done();
  });

  done();
};

export default jobs;
