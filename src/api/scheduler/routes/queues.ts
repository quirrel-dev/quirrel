import { FastifyPluginCallback } from "fastify";

import EndpointParamsSchema from "../schemas/queues/endpoint-params.json";
import SCANQueryStringSchema from "../schemas/queues/scan-querystring.json";
import EndpointJobIDParamsSchema from "../schemas/queues/endpoint-jobid-params.json";
import POSTQueuesEndpointBodySchema from "../schemas/queues/POST/body.json";
import PUTUpdateCronBodySchema from "../schemas/queues/update-cron.json";
import { EnqueueJob } from "../types/queues/POST/body";
import { SCANQuerystringParams } from "../types/queues/scan-querystring";
import { QueuesEndpointParams } from "../types/queues/endpoint-params";
import { QueuesEndpointIdParams } from "../types/queues/endpoint-jobid-params";
import { QueuesUpdateCronBody } from "../types/queues/update-cron";
import { isValidCronExpression } from "../../../shared/is-valid-cron";
import { isValidTimezone } from "../../../shared/repeat";
import { JobDTO } from "../../../client/job";

import * as Url from "url";

const jobs: FastifyPluginCallback = (fastify, opts, done) => {
  const jobsRepo = fastify.jobs;
  const queueRepo = jobsRepo.queueRepo;

  fastify.addHook("preValidation", fastify.tokenAuthPreValidation);

  function hasValidCronExpression(body: EnqueueJob): boolean {
    if (body.repeat?.cron) {
      return isValidCronExpression(body.repeat.cron);
    }

    return true;
  }

  function hasValidCronTimezone(body: EnqueueJob): boolean {
    if (body.repeat?.cronTimezone) {
      return isValidTimezone(body.repeat.cronTimezone);
    }

    return true;
  }

  function isAbsoluteURL(string: string): boolean {
    const url = Url.parse(string);
    return Boolean(url.protocol && url.hostname);
  }

  const baseSchema = {
    tags: ["Queueing"],
    security: fastify.adminBasedAuthEnabled
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

  const INVALID_ENDPOINT_ERROR = {
    statusCode: 400,
    error: "Bad Request",
    message: "endpoint needs to be absolute URL.",
  };

  const INVALID_TIMEZONE_ERROR = {
    statusCode: 400,
    error: "Bad Request",
    message:
      "body.repeat.cronTimezone is invalid, please provide a valid IANA timezone.",
  };

  function captureJobEnqueued(tokenId: string, job: JobDTO) {
    fastify.postHog?.capture({
      distinctId: tokenId,
      event: "jobs enqueued",
      properties: {
        endpoint: job.endpoint,
        exclusive: job.exclusive,
        repeat: job.repeat,
        retry: job.retry,
      },
    });
  }

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

      if (!isAbsoluteURL(endpoint)) {
        return reply.status(400).send(INVALID_ENDPOINT_ERROR);
      }

      if (!hasValidCronExpression(body)) {
        return reply.status(400).send(INVALID_CRON_EXPRESSION_ERROR);
      }

      if (!hasValidCronTimezone(body)) {
        return reply.status(400).send(INVALID_TIMEZONE_ERROR);
      }

      if (request.body.exclusive) {
        fastify.telemetrist?.dispatch("exclusive");
      }

      const job = await jobsRepo.enqueue(tokenId, endpoint, body);

      captureJobEnqueued(tokenId, job);

      fastify.logger?.jobCreated({ ...job, tokenId });

      reply.status(201).send(job);
    }
  );

  fastify.delete<{ Body: EnqueueJob; Params: QueuesEndpointParams }>(
    "/:endpoint",
    {
      schema: {
        ...baseSchema,
        params: EndpointParamsSchema,
        summary: "Empty a Queue",
      },
    },
    async (request, reply) => {
      fastify.telemetrist?.dispatch("empty_queue");

      const { tokenId } = request;
      const { endpoint } = request.params;

      await jobsRepo.emptyQueue(tokenId, endpoint);

      reply.status(204).send();
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

      if (!isAbsoluteURL(endpoint)) {
        return reply.status(400).send(INVALID_ENDPOINT_ERROR);
      }

      if (!body.every(hasValidCronExpression)) {
        return reply.status(400).send(INVALID_CRON_EXPRESSION_ERROR);
      }

      if (!body.every(hasValidCronTimezone)) {
        return reply.status(400).send(INVALID_TIMEZONE_ERROR);
      }

      const jobs = await Promise.all(
        body.map((b) => jobsRepo.enqueue(tokenId, endpoint, b))
      );

      jobs.forEach((job) => fastify.logger?.jobCreated({ ...job, tokenId }));
      jobs.forEach((job) => captureJobEnqueued(tokenId, job));

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

      fastify.postHog?.capture({
        distinctId: request.tokenId,
        event: "queues listed",
      });

      reply.status(200).send(queues);
    },
  });

  fastify.get("/stats", {
    schema: {
      ...baseSchema,
      summary: "Statistics about existing queues",
    },
    async handler(request, reply) {
      const stats = await jobsRepo.queueStatsByTokenId(request.tokenId);

      fastify.postHog?.capture({
        distinctId: request.tokenId,
        event: "queues stats",
      });

      reply.status(200).send(stats);
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

      fastify.postHog?.capture({
        distinctId: request.tokenId,
        event: "jobs scanned",
        properties: {
          endpoint: request.params.endpoint,
        },
      });

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

      fastify.postHog?.capture({
        distinctId: request.tokenId,
        event: "job fetched",
        properties: {
          endpoint,
          id,
        },
      });

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

      fastify.postHog?.capture({
        distinctId: request.tokenId,
        event: "job invoked",
        properties: {
          endpoint,
          id,
          result,
        },
      });

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

      fastify.postHog?.capture({
        distinctId: request.tokenId,
        event: "job deleted",
        properties: {
          endpoint,
          id,
          result,
        },
      });

      switch (result) {
        case "deleted":
          return reply.status(204).send();
        case "not_found":
          return reply.status(404).send();
      }
    },
  });

  fastify.put<{ Body: QueuesUpdateCronBody }>(
    "/update-cron",
    {
      schema: {
        ...baseSchema,
        body: PUTUpdateCronBodySchema,
        summary: "Update cron jobs",
      },
    },
    async (request, reply) => {
      fastify.telemetrist?.dispatch("update-cron");

      const { tokenId, body } = request;

      const cronsAreValid = body.crons.every((cron) =>
        isValidCronExpression(cron.schedule)
      );
      if (!cronsAreValid) {
        return reply.status(400).send("invalid cron expression");
      }

      const timezonesAreValid = body.crons.every(
        (cron) => !cron.timezone || isValidTimezone(cron.timezone)
      );
      if (!timezonesAreValid) {
        return reply.status(400).send("invalid timezone");
      }

      const response = await jobsRepo.updateCron(tokenId, body);

      fastify.logger?.cronUpdated(body, response.deleted);

      fastify.postHog?.capture({
        distinctId: request.tokenId,
        event: "cron updated",
        properties: {
          number: body.crons.length,
        },
      });

      reply.status(200).send(response);
    }
  );

  done();
};

export default jobs;
