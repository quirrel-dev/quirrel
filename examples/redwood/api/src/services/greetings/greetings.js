import greetingsQueue from "../../functions/greetingsQueue"

export const enqueueGreeting = async ({ name }) => {
  await greetingsQueue.enqueue(name, {
    delay: "1d"
  })
}