import { Queue } from "quirrel";

export default Queue("api/queues/greetings", async (name: string) => {
  console.log(`Greetings, ${name}!`);
});
