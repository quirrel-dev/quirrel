import { Queue } from "quirrel"

export default Queue("api/greetingsQueue", async (name: string) => {
  console.log(`Greetings, ${name}!`)
})
