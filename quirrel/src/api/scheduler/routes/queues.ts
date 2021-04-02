import { FastifyPluginCallback } from "fastify";

import EndpointParamsSchema from "../schemas/queues/endpoint-params.json";
import SCANQueryStringSchema from "../schemas/queues/scan-querystring.json";
import EndpointJobIDParamsSchema from "../schemas/queues/endpoint-jobid-params.json";
import POSTQueuesEndpointBodySchema from "../schemas/queues/POST/body.json";
import { EnqueueJob } from "../types/queues/POST/body";
import { SCANQuerystringParams } from "../types/queues/scan-querystring";
import { QueuesEndpointParams } from "../types/queues/endpoint-params";
import { QueuesEndpointIdParams } from "../types/queues/endpoint-jobid-params";

import { JobsRepo } from "../jobs-repo";
import { QueueRepo } from "../queue-repo";
import { isValidRegex } from "../../../shared/is-valid-regex";

const jobs: FastifyPluginCallback = (fastify, opts, done) => {
  const jobsRepo = new JobsRepo(fastify.owl);
  const queueRepo = new QueueRepo(fastify.redis, jobsRepo);

  fastify.addHook("preValidation", fastify.tokenAuthPreValidation);

  function hasValidCronExpression(body: EnqueueJob): boolean {
    if (body.repeat?.cron) {
      return isValidRegex(body.repeat.cron);
    }

    return true;
  }

  const baseSchema = {
    tags: ["Queueing"],
    security: fastify.authEnabled
      ? [
          {
            Admin: [],
            Impersonation: [],
          },
        ]
      : undefined,
  };

  const INVALID_CRON_EXPRESSION_ERROR = {
    statusCode: 400,
    error: "Bad Request",
    message:
      "body.repeat.cron uses unsupported syntax. See https://github.com/harrisiirak/cron-parser for reference.",
  };

  fastify.post<{ Body: EnqueueJob; Params: QueuesEndpointParams }>(
    "/:endpoint",
    {
      schema: {
        ...baseSchema,
        body: POSTQueuesEndpointBodySchema,
        params: EndpointParamsSchema,
        summary: "Enqueue a job",
      },
    },
    async (request, reply) => {
      fastify.telemetrist?.dispatch("enqueue");

      const { tokenId, body } = request;
      const { endpoint } = request.params;

      if (!hasValidCronExpression(body)) {
        return reply.status(400).send(INVALID_CRON_EXPRESSION_ERROR);
      }

      const job = await jobsRepo.enqueue(tokenId, endpoint, body);

      fastify.logger?.jobCreated({ ...job, tokenId });

      await queueRepo.add(endpoint, tokenId);

      reply.status(201).send(job);
    }
  );

  fastify.post<{
    Body: EnqueueJob[];
    Params: QueuesEndpointParams;
  }>(
    "/:endpoint/batch",
    {
      schema: {
        ...baseSchema,
        body: {
          type: "array",
          items: POSTQueuesEndpointBodySchema,
        },
        params: EndpointParamsSchema,
        summary: "Enqueue multiple jobs",
      },
    },
    async (request, reply) => {
      fastify.telemetrist?.dispatch("enqueue_batch");

      const { tokenId, body } = request;
      const { endpoint } = request.params;

      if (body.length > 1000) {
        return reply
          .status(400)
          .send(
            "That's a whole lot of jobs! If this wasn't a mistake, please get in touch to lift the 5k limit."
          );
      }

      if (!body.every(hasValidCronExpression)) {
        return reply.status(400).send(INVALID_CRON_EXPRESSION_ERROR);
      }

      const jobs = await Promise.all(
        body.map((b) => jobsRepo.enqueue(tokenId, endpoint, b))
      );

      await queueRepo.add(endpoint, tokenId);
      jobs.forEach((job) => fastify.logger?.jobCreated({ ...job, tokenId }));

      reply.status(201).send(jobs);
    }
  );

  fastify.get("/", {
    schema: {
      ...baseSchema,
      summary: "List existing queues",
      description:
        "Lists all queues that were used at some point, including currently empty ones.",
    },
    async handler(request, reply) {
      fastify.telemetrist?.dispatch("get_queues");
      const queues = await queueRepo.get(request.tokenId);

      reply.status(200).send(queues);
    },
  });

  fastify.get<{
    Params: QueuesEndpointParams;
    Querystring: SCANQuerystringParams;
  }>("/:endpoint", {
    schema: {
      ...baseSchema,
      params: EndpointParamsSchema,
      querystring: SCANQueryStringSchema,
      summary: "Iterate pending jobs",
    },
    async handler(request, reply) {
      fastify.telemetrist?.dispatch("scan_endpoint");

      const { cursor, jobs } = await jobsRepo.find(
        request.tokenId,
        request.params.endpoint,
        {
          cursor: request.query.cursor ?? 0,
        }
      );

      reply.status(200).send({
        cursor: cursor === 0 ? null : cursor,
        jobs,
      });
    },
  });

  fastify.get<{ Params: QueuesEndpointIdParams }>("/:endpoint/:id", {
    schema: {
      ...baseSchema,
      params: EndpointJobIDParamsSchema,
      summary: "Fetch specific job",
    },

    async handler(request, reply) {
      fastify.telemetrist?.dispatch("get_job");

      const { endpoint, id } = request.params;

      const job = await jobsRepo.findById(request.tokenId, endpoint, id);
      if (job) {
        reply.status(200).send(job);
      } else {
        reply.status(404).send("Not Found");
      }
    },
  });

  fastify.post<{ Params: QueuesEndpointIdParams }>("/:endpoint/:id", {
    schema: {
      ...baseSchema,
      params: EndpointJobIDParamsSchema,
      summary: "Invoke job",
      description: "Moves a job to the beginning of the queue.",
    },

    async handler(request, reply) {
      fastify.telemetrist?.dispatch("invoke");

      const { endpoint, id } = request.params;

      const result = await jobsRepo.invoke(request.tokenId, endpoint, id);
      switch (result) {
        case "invoked":
          return reply.status(204).send();
        case "not_found":
          return reply.status(404).send();
      }
    },
  });

  fastify.delete<{ Params: QueuesEndpointIdParams }>("/:endpoint/:id", {
    schema: {
      ...baseSchema,
      params: EndpointJobIDParamsSchema,
      summary: "Delete job",
    },

    async handler(request, reply) {
      fastify.telemetrist?.dispatch("delete");

      const { endpoint, id } = request.params;

      const result = await jobsRepo.delete(request.tokenId, endpoint, id);

      if (result === "deleted") {
        fastify.logger?.jobDeleted({ endpoint, id, tokenId: request.tokenId });
      }

      switch (result) {
        case "deleted":
          return reply.status(204).send();
        case "not_found":
          return reply.status(404).send();
      }
    },
  });

  fastify.addHook("onClose", async () => {
    await jobsRepo.close();
  });

  done();
};

export default jobs;
