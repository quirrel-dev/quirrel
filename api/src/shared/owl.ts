import Owl from "@quirrel/owl";
import { Redis } from "ioredis";
import * as cronParser from "cron-parser";

export function createOwl(redisFactory: () => Redis) {
  return new Owl(redisFactory as any, {
    every: (lastDate, scheduleMeta) => new Date(+lastDate + +scheduleMeta),
    cron: (lastDate, cronExpression) => {
      const expr = cronParser.parseExpression(cronExpression, {
        utc: true,
        startDate: lastDate,
      });

      const nextExecution = expr.next().toDate();

      return nextExecution;
    },
  });
}
