---
title: SvelteKit
---

```ts title="src/routes/greetingsQueue.ts"
import { Queue } from "quirrel/sveltekit";

const queue = Queue(
  "greetingsQueue", // 👈 the route it's reachable on
  async (job, meta) => {
    // do something
  }
);

export const post = queue

export default queue
```

Creates a new Queue.
Make sure to export it from an [endpoint](https://kit.svelte.dev/docs#routing-endpoints), otherwise it won't work.

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
