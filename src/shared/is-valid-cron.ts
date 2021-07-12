import CronParser from "cron-parser";

export function isValidCronExpression(cron: string) {
  try {
    CronParser.parseExpression(cron);
    return true;
  } catch (error) {
    return false;
  }
}
