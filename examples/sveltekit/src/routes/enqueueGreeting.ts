import type { RequestHandler } from "@sveltejs/kit";
import greetingsQueue from "./greetingsQueue";

export const post: RequestHandler = async (request) => {
  const { name } = request.body as any;
  await greetingsQueue.enqueue(name, {
    delay: "1h",
  });
  return {
    status: 200,
    body: "",
  };
};
