import type * as redis from "redis"
import * as Queue from "bee-queue";
import { HttpJob, HTTP_JOB_QUEUE } from "../shared/http-job";
import axios from "axios";

export interface QuirrelWorkerConfig {
    redis?: redis.ClientOpts | string;
}

export async function createWorker({ redis }: QuirrelWorkerConfig) {
    const jobsQueue = new Queue(HTTP_JOB_QUEUE, { redis: redis as any, isWorker: true });

    jobsQueue.process(async (job) => {
        const { endpoint, body } = job.data as HttpJob;
        await axios.post(endpoint, body);
    })

    async function close() {
        await jobsQueue.close()
    }

    return {
        close,
        healthCheck: () => jobsQueue.checkHealth()
    }
}