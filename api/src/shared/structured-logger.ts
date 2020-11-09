import { FastifyLoggerInstance } from "fastify";
import { Logger } from "./logger";

export class StructuredLogger implements Logger {
  constructor(private readonly logger: FastifyLoggerInstance) {}
  jobCreated(): void {
    throw new Error("Method not implemented.");
  }
  startingExecution(): { done: () => void } {
    throw new Error("Method not implemented.");
  }
}
