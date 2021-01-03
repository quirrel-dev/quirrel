---
title: Nuxt.js
---

```ts title="api/someQueue.js"
import { Queue } from "quirrel/nuxt";

export default Queue(
  "someQueue",
  async (job) => {
    // do something
  }
);
```

```js title="nuxt.config.js"
export default {
  serverMiddleware: [
    // will register the queue with Nuxt
    "~/api/someQueue.js",
  ]
}
```

Creates a new Queue.
Make sure to export it from a [Server Middleware](https://nuxtjs.org/docs/2.x/configuration-glossary/configuration-servermiddleware), otherwise it won't work.

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
