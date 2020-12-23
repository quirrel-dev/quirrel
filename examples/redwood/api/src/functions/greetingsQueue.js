import { Queue } from 'quirrel/redwood'

export const handler = Queue('greetingsQueue', async (name) => {
  console.log(`Greetings, ${name}!`)
})

export default handler
