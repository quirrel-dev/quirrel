import greetingsQueue from "./greetingsQueue";
import express from "express";
import bodyParser from "body-parser";

const handler = express();

handler.use(bodyParser.text());
handler.use(async (req, res) => {
  await greetingsQueue.enqueue(req.body, {
    delay: "1d"
  });

  res.end();
});

export default {
  path: "/api/enqueueGreeting",
  handler
};
