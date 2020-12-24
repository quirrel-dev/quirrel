import { Queue } from "quirrel/next";

export default Queue("api/queues/greetings", async (name: string) => {
  console.log(`Greetings, ${name}!`);
});
