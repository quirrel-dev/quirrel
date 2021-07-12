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

export function embedTimezone(cronExpression: string, tz: string) {
  if (!isValidTimezone(tz)) {
    throw new Error("Invalid timezone " + tz);
  }

  return cronExpression + ";" + tz;
}

export function parseTimezone(
  cronExpression: string
): [cron: string, tz: string] {
  const [cron, tz = "Etc/UTC"] = cronExpression.split(";");
  return [cron, tz];
}

export function cron(lastDate: Date, cronExpression: string): Date {
  const [cron, tz] = parseTimezone(cronExpression);
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
