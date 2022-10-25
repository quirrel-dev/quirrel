import type { RequestHandler } from "@sveltejs/kit";
import greetingsQueue from "../greetingsQueue/+server";

export const POST: RequestHandler = async ({request}) => {
  const { name } = await request.json() as any;
  await greetingsQueue.enqueue(name, {
    delay: "1h",
  });

  return new Response("", { status: 200 })
};
