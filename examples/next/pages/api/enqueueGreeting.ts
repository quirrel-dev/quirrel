import type { NextApiRequest, NextApiResponse } from "next";
import greetings from "./queues/greetings";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { name } = req.body;
  await greetings.enqueue(name, {
    delay: "1d",
  });
  res.status(200).end("OK");
};
