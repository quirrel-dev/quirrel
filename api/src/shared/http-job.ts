export const HTTP_JOB_QUEUE = "http";

const delimiter = ";";

export interface HttpJob {
  body: any;
}

export function encodeJobDescriptor(
  tokenId: string,
  endpoint: string,
  jobId: string
) {
  return [tokenId, endpoint, jobId].map(encodeURIComponent).join(delimiter);
}

export function decodeJobDescriptor(descriptor: string) {
  let repeatable = false;

  if (descriptor.startsWith("repeat:")) {
    const [repeat, queueDescriptor, b64Meta, lastTimestamp] = descriptor.split(
      ":"
    );
    const meta = Buffer.from(b64Meta, "base64").toString();
    descriptor = meta.split(":")[1];
    repeatable = true;
  }

  const [tokenId, endpoint, jobId] = descriptor.split(delimiter).map(decodeURIComponent);
  return {
    tokenId,
    endpoint,
    jobId,
    repeatable,
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
