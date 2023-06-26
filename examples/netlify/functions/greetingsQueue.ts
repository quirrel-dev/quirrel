// zip-it-and-ship-it doesn't properly tree-shake imports from "quirrel" yet, so we scope to "quirrel/combined"
import { Queue } from "quirrel/combined";

export const handler = Queue(
  ".netlify/functions/greetingsQueue",
  async (name: string) => {}
);

export default handler;
