import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { Job, Queue, QueueScheduler } from "bullmq";

import * as DELETEJobsParamsSchema from "../schemas/jobs/DELETE/params.json";
import { DELETEJobsIdParams } from "../types/jobs/DELETE/params";
import * as POSTJobsBodySchema from "../schemas/jobs/POST/body.json";
import { POSTJobsBody } from "../types/jobs/POST/body";
import {
  encodeExternalJobId,
  encodeInternalJobId,
  decodeExternalJobId,
  HttpJob,
  HTTP_JOB_QUEUE,
} from "../../shared/http-job";

import * as uuid from "uuid";

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
    defaultJobOptions: {
      removeOnComplete: true
    }
  });

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

      let { endpoint, body, runAt, delay, jobId } = request.body;

      if (typeof jobId === "undefined") {
        jobId = uuid.v4();
      }

      if (runAt) {
        delay = Number(new Date(runAt)) - Date.now();
      }

      await jobs.add(
        "default",
        {
          body,
        },
        {
          delay,
          jobId: encodeInternalJobId(tokenId, endpoint, jobId),
        }
      );

      reply.status(200);
      reply.send({
        jobId: encodeExternalJobId(endpoint, jobId),
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

      const id = url.slice(url.lastIndexOf("/") + 1);

      const { endpoint, customId } = decodeExternalJobId(id);
      const internalId = encodeInternalJobId(tokenId, endpoint, customId);

      const job: Job<HttpJob> | undefined = await jobs.getJob(internalId);
      if (job) {
        reply.status(200).send({
          jobId: id,
          data: job.data,
          plannedExecution: job.timestamp
        });
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

      const id = url.slice(url.lastIndexOf("/") + 1);

      const { endpoint, customId } = decodeExternalJobId(id);
      const internalId = encodeInternalJobId(tokenId, endpoint, customId);

      const job: Job<HttpJob> | undefined = await jobs.getJob(internalId);
      if (job) {
        await job.remove();
        reply.status(204);
      } else {
        reply.status(404).send("Not Found");
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
