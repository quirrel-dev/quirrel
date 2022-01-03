---
title: Remix
---

```ts title="app/queues/someQueue.server.ts"
import { Queue } from "quirrel/remix";

export default Queue(
  "queues/someQueue",
  async (job, meta) => {
    // do something
  },
);
```

```ts title="app/routes/queues/someQueue.ts"
import someQueue from "~/queues/someQueue.server";

export const action = someQueue;
```

Creates a new Queue.
Make sure to export it first from a file with the `.server` extension before the file type so it gets picked up by the server code pruning.
Then export it from a [route action](https://remix.run/docs/en/v1/api/conventions#action), otherwise it won't work.

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
