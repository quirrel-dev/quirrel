import { Queue } from "quirrel/sveltekit";

const queue = Queue("greetingsQueue", async (name: string) => {
  console.log(`Greetings, ${name}!`);
});

export const POST = queue;

export default queue;
