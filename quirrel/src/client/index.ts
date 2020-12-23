import { Job, JobDTO } from "./job";
import * as config from "./config";
import { runBuildTimeChecks } from "./buildtime-checks";
import * as z from "zod";
import type { IsExact, AssertTrue } from "conditional-type-checks";
import Encryptor from "secure-e2ee";
import { verify } from "secure-webhooks";
import ms from "ms";
import fetch from "cross-fetch";

export { Job };

if (process.env.NODE_ENV === "production") {
  runBuildTimeChecks();
}

export type QuirrelJobHandler<T> = (job: T) => Promise<void>;
export type DefaultJobOptions = Pick<EnqueueJobOpts, "exclusive">;

interface CreateQuirrelClientArgs<T> {
  route: string;
  handler: QuirrelJobHandler<T>;
  defaultJobOptions?: DefaultJobOptions;
  config?: {
    /**
     * @default http://localhost:9181 (in dev)
     * Recommended way to set this: process.env.QUIRREL_BASE_URL
     */
    applicationBaseUrl?: string;

    /**
     * Overrides URL of the Quirrel Endpoint.
     * @default https://api.quirrel.dev or http://localhost:9181
     * Recommended way to set this: process.env.QUIRREL_URL
     */
    quirrelBaseUrl?: string;

    /**
     * Bearer Secret for authenticating with Quirrel.
     * Obtain on quirrel.dev or using the API of a self-hosted instance.
     * Recommended way to set this: process.env.QUIRREL_TOKEN
     */
    token?: string;

    /**
     * Secret used for end-to-end encryption.
     * Needs to be 32 characters long.
     * Recommended way to set this: process.env.QUIRREL_ENCRYPTION_SECRET
     */
    encryptionSecret?: string;

    /**
     * Old Secrets that have been rotated out.
     * @see https://docs.quirrel.dev/docs/faq#my-encryption-secret-has-been-leaked-what-now
     * Recommended way to set this: process.env.QUIRREL_OLD_SECRETS
     */
    oldSecrets?: string[];
  };
}

const vercelMs = z
  .string()
  .regex(
    /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i,
    "Please provide a valid time span, according to https://github.com/vercel/ms"
  );

const timeDuration = z.union([z.number().positive(), vercelMs]);

const cron = z
  .string()
  .regex(
    /(@(yearly|monthly|weekly|daily|hourly))|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/,
    "Please provide a valid Cron expression. See https://github.com/harrisiirak/cron-parser for reference."
  );

const EnqueueJobOptsSchema = z.object({
  id: z.string().optional(),
  exclusive: z.boolean().optional(),
  override: z.boolean().optional(),
  delay: timeDuration.optional(),
  runAt: z.date().optional(),
  repeat: z
    .object({
      every: timeDuration.optional(),
      times: z.number().nonnegative().optional(),
      cron: cron.optional(),
    })
    .optional(),
});

type EnqueueJobOptsSchema = z.TypeOf<typeof EnqueueJobOptsSchema>;

type EnqueueJobOptsSchemaMatchesDocs = AssertTrue<
  IsExact<EnqueueJobOpts, EnqueueJobOptsSchema>
>;

export interface EnqueueJobOpts {
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

  /**
   * Determines what to do when a job
   * with the same ID already exists.
   * false: do nothing (default)
   * true: replace the job
   */
  override?: boolean;

  /**
   * Will delay the job's execution by the specified amount of milliseconds.
   * Supports human-readable notation as of @see https://github.com/vercel/ms.
   * If used together with `repeat`, this will delay the first job to be executed.
   */
  delay?: number | string;

  /**
   * Schedules the job for execution at the specified timestamp.
   */
  runAt?: Date;

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

function parseDuration(value: number | string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return ms(value);
  }

  return value;
}

function runAtToDelay(value: Date) {
  return +value - Date.now();
}

function getEncryptor(
  encryptionSecret: string | undefined,
  oldSecrets: string[] = []
) {
  if (!encryptionSecret) {
    return undefined;
  }

  return new Encryptor(encryptionSecret, [encryptionSecret, ...oldSecrets]);
}

function prefixUriToUrl(uri: string): string {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  return "https://" + uri;
}

function getAuthHeaders(
  token: string | undefined
): { Authorization: string } | {} {
  if (!token) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}

export class QuirrelClient<T> {
  private handler;
  private route;
  private defaultJobOptions;
  private encryptor;
  private authHeaders;
  private baseUrl;
  private token;

  constructor(args: CreateQuirrelClientArgs<T>) {
    this.handler = args.handler;
    this.defaultJobOptions = args.defaultJobOptions;

    const token = args.config?.token ?? config.getQuirrelToken();
    this.authHeaders = getAuthHeaders(token);

    const quirrelBaseUrl =
      args.config?.quirrelBaseUrl ?? config.getQuirrelBaseUrl();
    const applicationBaseUrl = prefixUriToUrl(
      args.config?.applicationBaseUrl ?? config.getApplicationBaseUrl()!
    );
    this.baseUrl =
      quirrelBaseUrl +
      "/queues/" +
      encodeURIComponent(applicationBaseUrl + "/" + args.route);
    this.token = args.config?.token ?? config.getQuirrelToken();
    this.route = args.route;
    this.encryptor = getEncryptor(
      args.config?.encryptionSecret ?? config.getEncryptionSecret(),
      args.config?.oldSecrets ?? config.getOldEncryptionSecrets() ?? undefined
    );
  }

  /**
   * Enqueue a job to the specified endpoint.
   * @param endpoint endpoint to execute the job against
   * @param opts job options
   */
  async enqueue(payload: T, opts: EnqueueJobOpts = {}): Promise<Job<T>> {
    if (typeof payload === "undefined") {
      throw new Error("Passing `undefined` as Payload is not allowed.");
    }

    opts = EnqueueJobOptsSchema.parse(opts);

    let delay = parseDuration(opts.delay);

    if ("runAt" in opts && opts.runAt) {
      delay = runAtToDelay(opts.runAt);
    }

    if (opts.repeat) {
      opts.repeat.every = parseDuration(opts.repeat?.every);
    }

    let stringifiedBody = JSON.stringify(payload);

    if (this.encryptor) {
      stringifiedBody = await this.encryptor.encrypt(stringifiedBody);
    }

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders,
      },
      credentials: "omit",
      body: JSON.stringify({
        ...this.defaultJobOptions,
        body: stringifiedBody,
        delay,
        id: opts.id,
        repeat: opts.repeat,
      }),
    });

    if (res.status === 201) {
      return await this.toJob(await res.json());
    }

    throw new Error(`Unexpected response: ${await res.text()}`);
  }

  private async decryptAndDecodeBody(body: string): Promise<T> {
    if (this.encryptor) {
      body = await this.encryptor.decrypt(body);
    }

    return JSON.parse(body);
  }

  private async toJob(dto: JobDTO): Promise<Job<T>> {
    return {
      ...dto,
      body: await this.decryptAndDecodeBody(dto.body),
      runAt: new Date(dto.runAt),
      delete: () => this.delete(dto.id),
      invoke: () => this.invoke(dto.id),
    };
  }

  /**
   * Iterate through scheduled jobs.
   * @param endpoint filter for this endpoint
   * @example
   * for await (const jobs of queue.get()) {
   *   // do smth
   * }
   */
  async *get(): AsyncGenerator<Job<T>[]> {
    let cursor: number | null = 0;

    while (cursor !== null) {
      const res = await fetch(this.baseUrl + "?cursor=" + cursor, {
        headers: this.authHeaders,
      });

      const json = await res.json();

      const { cursor: newCursor, jobs } = json as {
        cursor: number | null;
        jobs: JobDTO[];
      };

      cursor = newCursor;

      yield await Promise.all(jobs.map((dto) => this.toJob(dto)));
    }
  }

  /**
   * Get a specific job.
   * @returns null if no job was found.
   */
  async getById(id: string): Promise<Job<T> | null> {
    const res = await fetch(this.baseUrl + "/" + id, {
      headers: this.authHeaders,
    });

    if (res.status === 404) {
      return null;
    }

    if (res.status === 200) {
      return await this.toJob(await res.json());
    }

    throw new Error("Unexpected response: " + (await res.text()));
  }

  /**
   * Schedule a job for immediate execution.
   * @returns false if job could not be found.
   */
  async invoke(id: string): Promise<boolean> {
    const res = await fetch(this.baseUrl + "/" + id, {
      method: "POST",
      headers: this.authHeaders,
    });

    if (res.status === 404) {
      return false;
    }

    if (res.status === 204) {
      return true;
    }

    throw new Error("Unexpected response: " + (await res.text()));
  }

  /**
   * Delete a job, preventing it from executing.
   * @returns false if job could not be found.
   */
  async delete(id: string): Promise<boolean> {
    const res = await fetch(this.baseUrl + "/" + id, {
      method: "DELETE",
      headers: this.authHeaders,
    });

    if (res.status === 404) {
      return false;
    }

    if (res.status === 204) {
      return true;
    }

    throw new Error("Unexpected response: " + res.body);
  }

  async respondTo(
    body: string,
    signature: string
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }> {
    if (process.env.NODE_ENV === "production") {
      const valid = verify(body, this.token!, signature);
      if (!valid) {
        return {
          status: 401,
          headers: {},
          body: "Signature invalid.",
        };
      }
    }
    const payload = await this.decryptAndDecodeBody(body);

    console.log(`Received job to ${this.route}: `, payload);

    try {
      await this.handler(payload);

      return {
        status: 200,
        headers: {},
        body: "OK",
      };
    } catch (error) {
      return {
        status: 500,
        headers: {},
        body: String(error),
      };
    }
  }
}
