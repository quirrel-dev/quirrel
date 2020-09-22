let defaultEndpoint = process.env.QUIRREL_URL;

if (!defaultEndpoint) {
  if (process.env.NODE_ENV === "production") {
    defaultEndpoint = "https://api.quirrel.dev";
  } else {
    defaultEndpoint = "http://localhost:9181";
  }
}

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
    private readonly endpoint = defaultEndpoint,
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
        await this.delete(dto.id);
      },
    };
  }

  async enqueue(endpoint: string, opts: EnqueueJobOpts): Promise<Job> {
    const { body, status } = await this.fetcher({
      url: this.endpoint + "/jobs",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        endpoint,
        body: opts.body,
        runAt: opts.runAt,
        delay: opts.delay,
        jobId: opts.id,
      }),
    });

    if (status !== 201) {
      throw new Error(`Unexpected status: ${201}`);
    }

    return this.toJob(JSON.parse(body));
  }

  get(): AsyncIterator<Job[]> {
    let cursor: number | null = 0;
    return {
      next: async () => {
        if (cursor === null) {
          throw new Error("Iterator is already done.");
        }

        const { body } = await this.fetcher({
          url: this.endpoint + "/jobs",
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

  async getById(id: string): Promise<Job | null> {
    const { body, status } = await this.fetcher({
      url: this.endpoint + "/jobs/" + id,
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

  async delete(id: string): Promise<Job | null> {
    const { status, body } = await this.fetcher({
      url: this.endpoint + "/jobs/" + id,
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
