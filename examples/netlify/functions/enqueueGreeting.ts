import { Handler } from "@netlify/functions";
import greetingsQueue from "./greetingsQueue";

export const handler: Handler = async (request) => {
  const { body } = request;

  await greetingsQueue.enqueue(body, {
    delay: "5min",
  });

  return {
    statusCode: 200,
  };
};
