import { Queue } from "quirrel/nuxt";

export default Queue("someQueue", async (name: string) => {
  console.log(`Greetings, ${name}!`);
});
