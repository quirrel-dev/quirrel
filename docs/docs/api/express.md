---
title: Express / Connect
---

```ts
import { Queue } from "quirrel/connect";
import Express from "express";

const app = Express()

const someQueue = Queue(
  "someQueue",
  async (job) => {
    // do something
  }
)

app.use(someQueue)

app.listen(3000)
```

Creates a new Queue.
Since there's no convention for Express's default development port, you'll have to specify `QUIRREL_BASE_URL`.

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
