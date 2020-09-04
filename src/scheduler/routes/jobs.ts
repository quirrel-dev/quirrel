import { FastifyPluginCallback } from "fastify";

import * as POSTJobsBodySchema from "../schemas/jobs/POST/body.json";
import { POSTJobsBody } from "../types/jobs/POST/body";

const jobs: FastifyPluginCallback = (app, opts, done) => {
  app.post<{ Body: POSTJobsBody }>("/", {
    schema: {
      body: {
        data: POSTJobsBodySchema
      },
    },

    async handler(request, reply) {
      reply.status(200);
      reply.send("OK")
    },
  });

  done();
};

export default jobs;
