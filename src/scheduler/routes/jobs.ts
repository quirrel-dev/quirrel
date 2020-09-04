import { FastifyPluginCallback } from "fastify";
import * as Queue from "bee-queue";

import * as POSTJobsBodySchema from "../schemas/jobs/POST/body.json";
import { POSTJobsBody } from "../types/jobs/POST/body";
import { HttpJob, HTTP_JOB_QUEUE } from "../../shared/Job";

const jobs: FastifyPluginCallback = (app, opts, done) => {
  const jobs = new Queue(HTTP_JOB_QUEUE, { redis: app.redis as any, isWorker: false });

  app.post<{ Body: POSTJobsBody }>("/", {
    schema: {
      body: {
        data: POSTJobsBodySchema,
      },
    },

    async handler(request, reply) {
      const { endpoint, body } = request.body;

      await jobs.createJob<HttpJob>({ endpoint, body })
                .save();

      reply.status(200);
      reply.send("OK");
    },
  });

  app.addHook("onClose", async (instance, done) => {
    await jobs.close();
    done();
  })

  done();
};

export default jobs;
