export const HTTP_JOB_QUEUE = "http";

const delimiter = ";";

interface RepeatOptions {
  every: number;
  times: number;
  count: number;
}

export interface HttpJob {
  body: any;
  repeat?: RepeatOptions;
}

export function encodeJobDescriptor(
  tokenId: string,
  endpoint: string,
  jobId: string
) {
  return [tokenId, endpoint, jobId].map(encodeURIComponent).join(delimiter);
}

export function decodeJobDescriptor(descriptor: string) {
  const [tokenId, endpoint, jobId] = descriptor.split(delimiter).map(decodeURIComponent);
  return {
    tokenId,
    endpoint,
    jobId,
  };
}

export function encodeQueueDescriptor(tokenId: string, endpoint: string) {
  return [tokenId, endpoint].map(encodeURIComponent).join(delimiter);
}

export function decodeQueueDescriptor(id: string) {
  const [tokenId, endpoint] = id.split(delimiter).map(decodeURIComponent);

  return {
    tokenId,
    endpoint,
  };
}
