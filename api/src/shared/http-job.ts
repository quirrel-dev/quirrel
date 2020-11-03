export const HTTP_JOB_QUEUE = "http";

const delimiter = ";";

interface RepeatOptions {
  every?: number;
  times?: number;
  cron?: string;
  count: number;
}

export interface HttpJob {
  body?: string;
  repeat?: RepeatOptions;
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
