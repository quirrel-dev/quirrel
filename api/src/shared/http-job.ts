export const HTTP_JOB_QUEUE = "http";

export interface HttpJob {
  body: any;
}

export function encodeJobDescriptor(
  tokenId: string,
  endpoint: string,
  jobId: string
) {
  return [tokenId, endpoint, jobId].map(encodeURIComponent).join(":");
}

export function decodeJobDescriptor(id: string) {
  const [tokenId, endpoint, jobId] = id
    .split(":")
    .map(decodeURIComponent);

  return {
    tokenId,
    endpoint,
    jobId,
  };
}
