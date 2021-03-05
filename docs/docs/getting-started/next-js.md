---
title: Next.js
---

This document guides you through setting up Quirrel and creating your first queue in an existing project.

If you're looking for a tutorial instead, check out the [Water Drinking Reminder Tutorial](https://dev.to/quirrel/building-a-water-drinking-reminder-with-next-js-and-quirrel-1ckj).

## Installation

Architecturally, Quirrel consists of two main parts:

1. The Quirrel *server* receives jobs from your application and then makes requests back to it whenever a job is due.
2. The Quirrel *client* is used by your application to interface with the server.

First, we're gonna setup the Quirrel server locally.
To install it, simply run `npm install quirrel` in your project root,
then start it by running `npx quirrel`.
That's it!

:::note
You can use [`concurrently`](https://github.com/kimmobrunfeldt/concurrently)
to have the Quirrel server be started together with Next:
```json
"scripts": {
  "dev": "concurrently 'next dev' 'quirrel'"
}
```
:::

This is all we need installed to create our first Queue!

## Your first Queue

Create a new [API Route](https://nextjs.org/docs/api-routes/introduction) at `pages/api/queues/email.js` and paste the following: 

```js title="pages/api/queues/email.js"
import { Queue } from "quirrel/next"

export default Queue(
  "api/queues/email", // 👈 the route it's reachable on
  async job => {
    await email.send( ... )
  }
)
```

Up top, we're importing `Queue`, which is a function that we use to declare a new Queue and export it as default.

`Queue` takes two arguments.  
The first one is the location of the API Route it's been declared in.
This is required for the Quirrel server to know where jobs need to be sent upon execution.  
The second one is a worker function that actually executes the job.
In this example, it sends an email.


Now that we declared the Queue, using it is straight forwward.
Simply import it and enqueue a new job:

```ts {6-9}
import EmailQueue from "pages/api/queues/email"

// could be some API route / getServerSideProps / ...
export default async (req, res) => {

  await EmailQueue.enqueue(
    ..., // job to be enqueued
    { delay: "24h" } // scheduling options
  )

}
```

Calling `.enqueue` will trigger a call to the Quirrel server to enqueue a new job.
After 24 hours, when the job is due, the Queue's worker function will receive the job payload and execute it.

## Meet the Development UI

To speed up development, Quirrel allows you to monitor pending jobs in the Development UI.
In there, you can also manually invoke jobs, so you don't have to wait for 24 hours everytime you test something.

To use it, simply run `quirrel ui` or open [ui.quirrel.dev](https://ui.quirrel.dev) in your browser.

<img src={require("./dev-ui.png").default} alt="Screenshot of the Development UI" height="400rem"/>
