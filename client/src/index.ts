import Encryptor from "secure-e2ee";
import { verify } from "secure-webhooks";

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

interface JobDTO {
  id: string;
  endpoint: string;
  body: string;
  runAt: string;
  repeat?: {
    every: number;
    times: number;
    count: number;
  };
}

interface BaseEnqueueJobOpts {
  body?: any;
  id?: string;
  repeat?: {
    every: number;
    times: number;
  };
}

interface DelayedEnqueueJobOpts extends BaseEnqueueJobOpts {
  delay?: number;
}

interface ScheduledEnqueueJobOpts extends BaseEnqueueJobOpts {
  runAt?: Date;
}

export type EnqueueJobOpts = DelayedEnqueueJobOpts | ScheduledEnqueueJobOpts;

export interface Job extends Omit<JobDTO, "runAt" | "body"> {
  runAt: Date;
  body: unknown;
  delete(): Promise<Job | null>;
  invoke(): Promise<Job | null>;
}

interface HttpRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

type HttpFetcher = (req: HttpRequest) => Promise<HttpResponse>;

type SignatureCheckResult<T> =
  | { isValid: true; body: T }
  | {
      isValid: false;
      body: null;
    };

interface QuirrelClientOpts {
  fetcher: HttpFetcher;
  baseUrl?: string;
  token?: string;
  encryptionSecret?: string;
  oldSecrets?: string[];
}

export class QuirrelClient {
  private readonly encryptor: Encryptor | undefined;

  private readonly token;
  private readonly baseUrl;
  private readonly fetcher;

  constructor(opts: QuirrelClientOpts) {
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
    this.fetcher = enrichedOpts.fetcher;
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

  async enqueue(endpoint: string, opts: EnqueueJobOpts): Promise<Job> {
    let delay: number | undefined = undefined;

    if ("delay" in opts && opts.delay) {
      delay = opts.delay;
    }

    if ("runAt" in opts && opts.runAt) {
      delay = +opts.runAt - Date.now();
    }

    let stringifiedBody = JSON.stringify(opts.body);

    if (this.encryptor) {
      stringifiedBody = this.encryptor.encrypt(stringifiedBody);
    }

    const { body, status } = await this.fetcher({
      url: this.baseUrl + "/queues/" + encodeURIComponent(endpoint),
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
    });

    if (status !== 201) {
      throw new Error(`Unexpected status: ${status}`);
    }

    return this.toJob(JSON.parse(body));
  }

  async *get(endpoint?: string) {
    let cursor: number | null = 0;

    while (cursor !== null) {
      const { body } = await this.fetcher({
        url:
          this.baseUrl +
          "/queues/" +
          (!!endpoint ? encodeURIComponent(endpoint!) : "") +
          "?cursor=" +
          cursor,
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      const { cursor: newCursor, jobs } = JSON.parse(body) as {
        cursor: number | null;
        jobs: JobDTO[];
      };

      cursor = newCursor;

      yield jobs.map((dto) => this.toJob(dto));
    }
  }

  async getById(endpoint: string, id: string): Promise<Job | null> {
    const { body, status } = await this.fetcher({
      url: this.baseUrl + "/queues/" + encodeURIComponent(endpoint) + "/" + id,
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (status === 404) {
      return null;
    }

    if (status === 200) {
      return this.toJob(JSON.parse(body));
    }

    throw new Error("Unexpected response: " + status);
  }

  async invoke(endpoint: string, id: string): Promise<Job | null> {
    const { status, body } = await this.fetcher({
      url: this.baseUrl + "/queues/" + encodeURIComponent(endpoint) + "/" + id,
      method: "POST",
      headers: this.getAuthHeaders(),
    });

    if (status === 404) {
      return null;
    }

    if (status === 200) {
      return this.toJob(JSON.parse(body));
    }

    throw new Error("Unexpected response: " + status);
  }

  async delete(endpoint: string, id: string): Promise<Job | null> {
    const { status, body } = await this.fetcher({
      url: this.baseUrl + "/queues/" + encodeURIComponent(endpoint) + "/" + id,
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (status === 404) {
      return null;
    }

    if (status === 200) {
      return this.toJob(JSON.parse(body));
    }

    throw new Error("Unexpected response: " + status);
  }

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

  decryptBody(body: string) {
    if (this.encryptor) {
      body = this.encryptor.decrypt(body);
    }

    return JSON.parse(body);
  }
}
