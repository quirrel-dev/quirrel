import Encryptor from "secure-e2ee";
import { verify } from "secure-webhooks";
import ms from "ms";
import fetch from "cross-fetch";

const fallbackEndpoint =
  process.env.NODE_ENV === "production"
    ? "https://api.quirrel.dev"
    : "http://localhost:9181";

const defaultBaseUrl = process.env.QUIRREL_URL ?? fallbackEndpoint;

const defaultToken = process.env.QUIRREL_TOKEN;

const defaultEncryptionSecret = process.env.QUIRREL_ENCRYPTION_SECRET;
const defaultOldSecrets: string[] | null = JSON.parse(
  process.env.QUIRREL_OLD_SECRETS ?? "null"
);

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

export interface BaseEnqueueJobOpts {
  /**
   * The job's payload.
   */
  body?: any;

  /**
   * Can be used to make a job easier to manage.
   * If there's already a job with the same ID, this job will be trashed.
   * @tutorial https://demo.quirrel.dev/managed
   */
  id?: string;

  /**
   * If set to `true`,
   * no other job (on the same queue)
   * will be executed at the same time.
   */
  exclusive?: boolean;

  repeat?: {
    /**
     * Will make the job repeat every X milliseconds.
     * Supports human-readable notation as of @see https://github.com/vercel/ms.
     * If `delay` isn't set, the first repetition will be executed immediately.
     */
    every?: number | string;

    /**
     * Can be used in conjunction with @field every and @field cron
     * to limit the number of executions.
     */
    times?: number;

    /**
     * Schedules the job according to the Cron expression.
     * @see https://github.com/harrisiirak/cron-parser for supported syntax
     * If `delay` isn't set, the first repetition will be executed immediately.
     */
    cron?: string;
  };
}

export interface DelayedEnqueueJobOpts extends BaseEnqueueJobOpts {
  /**
   * Will delay the job's execution by the specified amount of milliseconds.
   * Supports human-readable notation as of @see https://github.com/vercel/ms.
   * If used together with `repeat`, this will delay the first job to be executed.
   */
  delay?: number | string;
}

export interface ScheduledEnqueueJobOpts extends BaseEnqueueJobOpts {
  /**
   * Schedules the job for execution at the specified timestamp.
   */
  runAt?: Date;
}

export type EnqueueJobOpts = DelayedEnqueueJobOpts | ScheduledEnqueueJobOpts;

export interface Job extends Omit<JobDTO, "runAt" | "body"> {
  /**
   * Date that the job has been scheduled for.
   * If it's a repeated job, this is the date for the next execution.
   */
  readonly runAt: Date;
  /**
   * Job payload.
   */
  readonly body: unknown;

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

type SignatureCheckResult<T> =
  | { isValid: true; body: T }
  | {
      isValid: false;
      body: null;
    };

interface QuirrelClientOpts {
  /**
   * URL of the Quirrel Endpoint.
   * @default https://api.quirrel.dev or http://localhost:9181
   */
  baseUrl?: string;

  /**
   * Bearer Secret for authenticating with Quirrel.
   * Obtain on quirrel.dev or using the API of a self-hosted instance.
   */
  token?: string;

  /**
   * Secret used for end-to-end encryption.
   * Needs to be 32 characters long.
   */
  encryptionSecret?: string;

  /**
   * Old Secrets that have been rotated out.
   * @see https://docs.quirrel.dev/faq#my-encryption-secret-has-been-leaked-what-now
   */
  oldSecrets?: string[];
}

export class QuirrelClient {
  private readonly encryptor: Encryptor | undefined;

  private readonly token;
  private readonly baseUrl;

  /**
   * Constructs a new Quirrel Client.
   * @param opts
   */
  constructor(opts: QuirrelClientOpts = {}) {
    const enrichedOpts: QuirrelClientOpts = {
      baseUrl: defaultBaseUrl,
      token: defaultToken,
      encryptionSecret: defaultEncryptionSecret,
      oldSecrets: defaultOldSecrets ?? undefined,
      ...opts,
    };
    if (enrichedOpts.encryptionSecret) {
      const decryptionSecrets = [enrichedOpts.encryptionSecret];
      if (enrichedOpts.oldSecrets) {
        decryptionSecrets.push(...enrichedOpts.oldSecrets);
      }

      this.encryptor = new Encryptor(
        enrichedOpts.encryptionSecret,
        decryptionSecrets
      );
    }

    this.token = enrichedOpts.token;
    this.baseUrl = enrichedOpts.baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.token) {
      return {
        Authorization: `Bearer ${this.token}`,
      };
    } else {
      return {};
    }
  }

  private toJob(dto: JobDTO): Job {
    return {
      ...dto,
      body: this.decryptBody(dto.body),
      runAt: new Date(dto.runAt),
      delete: () => this.delete(dto.endpoint, dto.id),
      invoke: () => this.invoke(dto.endpoint, dto.id),
    };
  }

  /**
   * Enqueue a job to the specified endpoint.
   * @param endpoint endpoint to execute the job against
   * @param opts job options
   */
  async enqueue(endpoint: string, opts: EnqueueJobOpts): Promise<Job> {
    let delay: number | undefined = undefined;

    if ("delay" in opts && opts.delay) {
      if (typeof opts.delay === "string") {
        delay = ms(opts.delay);
      } else {
        delay = opts.delay;
      }
    }

    if ("runAt" in opts && opts.runAt) {
      delay = +opts.runAt - Date.now();
    }

    if (typeof opts.repeat?.every === "string") {
      opts.repeat.every = ms(opts.repeat.every);
    }

    let stringifiedBody = JSON.stringify(opts.body);

    if (this.encryptor) {
      stringifiedBody = this.encryptor.encrypt(stringifiedBody);
    }

    const res = await fetch(
      this.baseUrl + "/queues/" + encodeURIComponent(endpoint),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          body: stringifiedBody,
          delay,
          id: opts.id,
          repeat: opts.repeat,
        }),
      }
    );

    if (res.status !== 201) {
      throw new Error(`Unexpected status: ${res.status}`);
    }

    const body = await res.json();

    return this.toJob(body);
  }

  /**
   * Iterate through scheduled jobs.
   * @param endpoint filter for this endpoint
   * @example
   * for await (const jobs of queue.get()) {
   *   // do smth
   * }
   */
  async *get(endpoint?: string) {
    let cursor: number | null = 0;

    while (cursor !== null) {
      const res = await fetch(
        this.baseUrl +
          "/queues" +
          (!!endpoint ? "/" + encodeURIComponent(endpoint!) : "") +
          "?cursor=" +
          cursor,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const json = await res.json();

      const { cursor: newCursor, jobs } = json as {
        cursor: number | null;
        jobs: JobDTO[];
      };

      cursor = newCursor;

      yield jobs.map((dto) => this.toJob(dto));
    }
  }

  /**
   * Get a specific job.
   * @returns null if no job was found.
   */
  async getById(endpoint: string, id: string): Promise<Job | null> {
    const res = await fetch(
      this.baseUrl + "/queues/" + encodeURIComponent(endpoint) + "/" + id,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (res.status === 404) {
      return null;
    }

    if (res.status === 200) {
      return this.toJob(await res.json());
    }

    throw new Error("Unexpected response: " + res.status);
  }

  /**
   * Schedule a job for immediate execution.
   * @returns null if job could not be found.
   */
  async invoke(endpoint: string, id: string): Promise<boolean> {
    const res = await fetch(
      this.baseUrl + "/queues/" + encodeURIComponent(endpoint) + "/" + id,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
      }
    );

    if (res.status === 404) {
      return false;
    }

    if (res.status === 204) {
      return true;
    }

    throw new Error("Unexpected response: " + res.status);
  }

  /**
   * Delete a job, preventing it from executing.
   * @returns null if job could not be found.
   */
  async delete(endpoint: string, id: string): Promise<boolean> {
    const res = await fetch(
      this.baseUrl + "/queues/" + encodeURIComponent(endpoint) + "/" + id,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      }
    );

    if (res.status === 404) {
      return false;
    }

    if (res.status === 204) {
      return true;
    }

    throw new Error("Unexpected response: " + res.status);
  }

  /**
   * Verify an incoming request for correct signature
   * and decrypt / decode the body.
   */
  verifyRequestSignature<T = any>(
    headers: { "x-quirrel-signature": string },
    body: string
  ): SignatureCheckResult<T> {
    if (process.env.NODE_ENV === "production") {
      if (!this.token) {
        throw new Error("No token specified.");
      }

      const valid = verify(body, this.token, headers["x-quirrel-signature"]);
      if (!valid) {
        return {
          isValid: false,
          body: null,
        };
      }
    }

    return {
      isValid: true,
      body: this.decryptBody(body),
    };
  }

  /**
   * Decrypt and decode the body.
   */
  decryptBody(body: string) {
    if (this.encryptor) {
      body = this.encryptor.decrypt(body);
    }

    return JSON.parse(body);
  }
}
