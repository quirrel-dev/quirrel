const fallbackEndpoint =
  process.env.NODE_ENV === "production"
    ? "https://api.quirrel.dev"
    : "http://localhost:9181";

const defaultBaseUrl = process.env.QUIRREL_URL ?? fallbackEndpoint;

const defaultToken = process.env.QUIRREL_TOKEN;

if (process.env.NODE_ENV === "production" && !defaultToken) {
  throw new Error("Make sure to provide QUIRREL_TOKEN env var.");
}

interface JobDTO {
  id: string;
  endpoint: string;
  body: unknown;
  runAt: string;
}

export interface EnqueueJobOpts {
  body?: any;
  runAt?: Date;
  delay?: number;
  id?: string;
}

export interface Job extends Omit<JobDTO, "runAt"> {
  runAt: Date;
  delete(): Promise<void>;
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
    private readonly baseUrl = defaultBaseUrl,
    private readonly token = defaultToken
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
      delete: async () => {
        await this.delete(dto.endpoint, dto.id);
      },
    };
  }

  async enqueue(endpoint: string, opts: EnqueueJobOpts): Promise<Job> {
    const { body, status } = await this.fetcher({
      url: this.baseUrl + "/queues/" + encodeURIComponent(endpoint),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        body: opts.body,
        runAt: opts.runAt?.toISOString(),
        delay: opts.delay,
        jobId: opts.id,
      }),
    });

    if (status !== 201) {
      throw new Error(`Unexpected status: ${201}`);
    }

    return this.toJob(JSON.parse(body));
  }

  get(endpoint: string): AsyncIterator<Job[]> {
    let cursor: number | null = 0;
    return {
      next: async () => {
        if (cursor === null) {
          throw new Error("Iterator is already done.");
        }

        const { body } = await this.fetcher({
          url: this.baseUrl + "/queues/" + encodeURIComponent(endpoint),
          method: "GET",
          headers: this.getAuthHeaders(),
        });

        const { cursor: newCursor, jobs } = JSON.parse(body) as {
          cursor: number | null;
          jobs: JobDTO[];
        };

        cursor = newCursor;

        return {
          value: jobs.map((dto) => this.toJob(dto)),
          done: cursor === null,
        };
      },
    };
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
