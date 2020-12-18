export interface JobDTO {
  /**
   * ID, used in conjunction with `endpoint` to identify the job.
   */
  readonly id: string;

  /**
   * Endpoint the job will be executed against.
   * It's the HTTP address of your Queue.
   */
  readonly endpoint: string;

  /**
   * Stringified and potentially encrypted job payload.
   */
  readonly body: string;

  /**
   * Date that the job has been scheduled for.
   * @implements ISO-8601
   */
  readonly runAt: string;

  /**
   * Guarantees that no other job (from the same queue)
   * is executed while this job is being executed.
   */
  readonly exclusive: boolean;

  /**
   * Present if the job has been scheduled to repeat.
   */
  readonly repeat?: {
    /**
     * Interval at which the job is executed.
     */
    readonly every?: number;

    /**
     * Maximum number of repetitions to execute.
     */
    readonly times?: number;

    /**
     * Cron expression that's used for scheduling.
     * @see https://github.com/harrisiirak/cron-parser
     */
    readonly cron?: string;

    /**
     * What repetition the next execution will be.
     * Starts at 1, increments with every execution.
     */
    readonly count: number;
  };
}

export interface Job<T> extends Omit<JobDTO, "runAt" | "body"> {
  /**
   * Date that the job has been scheduled for.
   * If it's a repeated job, this is the date for the next execution.
   */
  readonly runAt: Date;

  /**
   * Job payload.
   */
  readonly body: T;

  /**
   * Delete this job.
   * @returns false if the job already has been deleted.
   */
  delete(): Promise<boolean>;

  /**
   * Schdule this job for immediate execution.
   * If it's a repeated job, the next executions will be scheduled normally.
   * @returns false if the job has been deleted in the meantime.
   */
  invoke(): Promise<boolean>;
}
