import { Queue } from "quirrel/blitz"

export default Queue("api/greetingsQueue", async (name: string) => {
  console.log(`Greetings, ${name}!`)
})
