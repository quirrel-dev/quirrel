const defaultEndpoint = process.env.QUIRREL_API ?? "https://api.quirrel.dev";
const defaultToken = process.env.QUIRREL_TOKEN;

type JobDTO = any;

interface Job extends JobDTO {
  delete(): Promise<void>;
}

interface HttpRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers: Record<string, string>;
  body: string;
}

interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

type HttpFetcher = (req: HttpRequest) => Promise<HttpResponse>;

class QuirrelClient {
  constructor(
    private readonly fetcher: HttpFetcher,
    private readonly endpoint = defaultEndpoint,
    private readonly token = defaultToken
  ) {}

  async enqueue(): Promise<Job> {
    // ...
  }

  get(): AsyncIterator<Job> {
    let cursor = 0
    return {
      async next(): Promise<IteratorResult<Job[]>> {
        cursor = cursor + 1
        return {
          value: [],
          done: cursor === null
        }
      }
    }
  }

  async getById(id: string): Promise<Job | null> {
    // ...
    return null
  }

  async delete(id: string): Promise<Job | null> {
    // ...
  }
}
