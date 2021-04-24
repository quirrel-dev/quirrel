import Owl from "@quirrel/owl";
import { Redis } from "ioredis";
import cronParser from "cron-parser";

export function isValidTimezone(tz: string) {
  try {
    const expr = cronParser.parseExpression("* * * * *", {
      tz,
    });
    expr.next();
    return true;
  } catch (error) {
    return false;
  }
}

export function cron(lastDate: Date, cronExpression: string): Date {
  const [cron, tz = "Etc/UTC"] = cronExpression.split(";");
  const expr = cronParser.parseExpression(cron, {
    currentDate: lastDate,
    tz,
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
