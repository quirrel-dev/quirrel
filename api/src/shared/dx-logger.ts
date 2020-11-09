import { Logger } from "./logger";

export class DxLogger implements Logger {
  jobCreated(): void {
    throw new Error("Method not implemented.");
  }
  startingExecution(): { done: () => void; } {
    throw new Error("Method not implemented.");
  }

}