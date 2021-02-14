import { FastifyPluginCallback } from "fastify";

import EndpointParamsSchema from "../schemas/queues/endpoint-params.json";
import SCANQueryStringSchema from "../schemas/queues/scan-querystring.json";
import EndpointJobIDParamsSchema from "../schemas/queues/endpoint-jobid-params.json";
import POSTQueuesEndpointBodySchema from "../schemas/queues/POST/body.json";
import { POSTQueuesEndpointBody } from "../types/queues/POST/body";
import { SCANQuerystringParams } from "../types/queues/scan-querystring";
import { QueuesEndpointParams } from "../types/queues/endpoint-params";
import { QueuesEndpointIdParams } from "../types/queues/endpoint-jobid-params";

import { JobsRepo } from "../jobs-repo";
import { QueueRepo } from "../queue-repo";

const jobs: FastifyPluginCallback = (fastify, opts, done) => {
  const jobsRepo = new JobsRepo(fastify.redisFactory);
  const queueRepo = new QueueRepo(fastify.redis, jobsRepo);

  fastify.addHook("preValidation", fastify.tokenAuthPreValidation);

  fastify.post<{ Body: POSTQueuesEndpointBody; Params: QueuesEndpointParams }>(
    "/:endpoint",
    {
      schema: {
        body: POSTQueuesEndpointBodySchema,
        params: EndpointParamsSchema,
      },
    },
    async (request, reply) => {
      fastify.telemetrist?.dispatch("enqueue");

      const { tokenId, body } = request;
      const { endpoint } = request.params;

      const job = await jobsRepo.enqueue(tokenId, endpoint, body);

      fastify.logger?.jobCreated({ ...job, tokenId });

      await queueRepo.add(endpoint, tokenId);

      reply.status(201).send(job);
    }
  );

  fastify.post<{
    Body: POSTQueuesEndpointBody[];
    Params: QueuesEndpointParams;
  }>(
    "/:endpoint/batch",
    {
      schema: {
        body: {
          type: "array",
          items: POSTQueuesEndpointBodySchema,
        },
        params: EndpointParamsSchema,
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
            "That's a whole lot of jobs! If this wasn't a mistake, please get in touch with Simon to lift the 5k limit."
          );
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
      params: EndpointParamsSchema,
      querystring: SCANQueryStringSchema,
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
      params: EndpointJobIDParamsSchema,
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
      params: EndpointJobIDParamsSchema,
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
      params: EndpointJobIDParamsSchema,
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
