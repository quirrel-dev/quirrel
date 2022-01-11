declare module "@vercel/fetch-retry" {
  import type { fetch } from "cross-fetch";
  import { Options as RetryOptions } from "async-retry";
  export default function retry(
    f: typeof fetch
  ): (
    input: RequestInfo,
    init?: RequestInit & {
      retry?: RetryOptions;
    }
  ) => Promise<Response>;
}
