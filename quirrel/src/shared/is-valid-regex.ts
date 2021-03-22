import CronParser from "cron-parser";

export function isValidRegex(regex: string) {
  try {
    CronParser.parseExpression(regex);
    return true;
  } catch (error) {
    return false;
  }
}
