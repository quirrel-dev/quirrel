---
title: Blitz.js
---

```ts title="app/api/someQueue.ts"
import { Queue } from "quirrel/blitz";

export default Queue(
    "api/someQueue",
    async (job) => {
        // do something
    }
);
```

Creates a new Queue.
Make sure to export it from an [API Route](https://blitzjs.com/docs/api-routes), otherwise it won't work.

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
