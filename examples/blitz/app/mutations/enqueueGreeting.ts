import greetingsQueue from "app/api/greetingsQueue"

export default async function enqueueGreeting(name: string) {
  await greetingsQueue.enqueue(name, {
    delay: "1d",
  })
}
