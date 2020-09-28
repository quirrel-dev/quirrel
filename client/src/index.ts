const fallbackEndpoint =
  process.env.NODE_ENV === "production"
    ? "https://api.quirrel.dev"
    : "http://localhost:9181";

const defaultBaseUrl = process.env.QUIRREL_URL ?? fallbackEndpoint;

const defaultToken = process.env.QUIRREL_TOKEN;

interface JobDTO {
  id: string;
  endpoint: string;
  body: unknown;
  runAt: string;
}

interface BaseEnqueueJobOpts {
  body?: any;
  id?: string;
}

interface DelayedEnqueueJobOpts extends BaseEnqueueJobOpts {
  delay?: number;
}

interface ScheduledEnqueueJobOpts extends BaseEnqueueJobOpts {
  runAt?: Date;
}

export type EnqueueJobOpts = DelayedEnqueueJobOpts | ScheduledEnqueueJobOpts;

export interface Job extends Omit<JobDTO, "runAt"> {
  runAt: Date;
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

export class QuirrelClient {
  constructor(
    private readonly fetcher: HttpFetcher,
    readonly baseUrl = defaultBaseUrl,
    readonly token = defaultToken
  ) {}

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

    const { body, status } = await this.fetcher({
      url: this.baseUrl + "/queues/" + encodeURIComponent(endpoint),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        body: opts.body,
        delay,
        id: opts.id,
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
          (!!endpoint ? encodeURIComponent(endpoint!) : ""),
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
}
