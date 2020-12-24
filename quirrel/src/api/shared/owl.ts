import Owl from "@quirrel/owl";
import { Redis } from "ioredis";
import cronParser from "cron-parser";

export function cron(lastDate: Date, cronExpression: string): Date {
  const expr = cronParser.parseExpression(cronExpression, {
    utc: true,
    currentDate: lastDate,
  });

  const nextExecution = expr.next().toDate();

  return nextExecution;
}

export function every(lastDate: Date, scheduleMeta: string): Date {
  return new Date(+lastDate + +scheduleMeta);
}

export function createOwl(redisFactory: () => Redis) {
  return new Owl(redisFactory as any, {
    every,
    cron,
  });
}
