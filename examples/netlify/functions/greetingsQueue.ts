import { Queue } from "quirrel/netlify";

export const handler = Queue(
  ".netlify/functions/greetingsQueue",
  async (name: string) => {}
);

export default handler;
