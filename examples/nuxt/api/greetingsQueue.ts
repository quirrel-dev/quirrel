import { Queue } from "quirrel/nuxt";

export default Queue("greetingsQueue", async (name: string) => {
  console.log(`Greetings, ${name}!`);
});
