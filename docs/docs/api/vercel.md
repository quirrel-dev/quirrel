---
title: Vercel Serverless Functions
---

```ts title="api/someQueue.ts"
import { Queue } from "quirrel/vercel";

export default Queue(
  "api/someQueue",
  async (job) => {
    // do something
  }
);
```

Creates a new Queue.
Make sure to export it from a [Serverless Function](https://vercel.com/docs/serverless-functions/introduction#an-example-node.js-serverless-function), otherwise it won't work.

#### Parameters

```ts
function Queue<T>(
    path: string,
    worker: (job: T): Promise<void>,
    defaultJobOptions?: { exclusive?: boolean }
): QueueInstance<T>
```

| Parameter           | Usage                                                           |
| ------------------- | --------------------------------------------------------------- |
| `path`              | The route that this queue is reachable at.                      |
| `worker`            | a function that takes the job's payload and returns a `Promise` |
| `defaultJobOptions` | Optional. Use to set default options applied to every job.      |
