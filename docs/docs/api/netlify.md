---
title: Netlify
---

```ts title="functions/someQueue.js"
import { Queue } from "quirrel/netlify";

export const handler = Queue(
  ".netlify/functions/someQueue",
  async (job, meta) => {
    // do something
  }
);

export default handler;
```

Creates a new Queue.
Make sure to export it from a [Function](https://docs.netlify.com/functions/build-with-javascript/), otherwise it won't work.

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
