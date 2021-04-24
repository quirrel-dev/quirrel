import Owl from "@quirrel/owl";
import { Redis } from "ioredis";
import { cron, every } from "../../shared/repeat";

export function createOwl(redisFactory: () => Redis) {
  return new Owl(redisFactory as any, {
    every,
    cron,
  });
}
