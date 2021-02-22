---
title: Redwood
---

```ts title="api/src/functions/someQueue.js"
import { Queue } from "quirrel/redwood";

export const handler = Queue(
  "someQueue",
  async (job, meta) => {
    // do something
  }
);

export default handler;
```

Creates a new Queue.
Make sure to export it from a [Serverless Function](https://redwoodjs.com/docs/serverless-functions), otherwise it won't work.

#### Parameters

```ts
function Queue<T>(
    path: string,
    worker: (job: T, meta: JobMeta): Promise<void>,
    defaultJobOptions?: { exclusive?: boolean }
): QueueInstance<T>
```

| Parameter           | Usage                                                           |
| ------------------- | --------------------------------------------------------------- |
| `path`              | The route that this queue is reachable at.                      |
| `worker`            | a function that takes the job's payload and returns a `Promise` |
| `defaultJobOptions` | Optional. Use to set default options applied to every job.      |
