export const HTTP_JOB_QUEUE = "http";

export interface HttpJob {
  body: any;
}

export function encodeInternalJobId(
  tokenId: string,
  endpoint: string,
  idempotencyKey: string
) {
  return [tokenId, endpoint, idempotencyKey].map(encodeURIComponent).join(":");
}

export function decodeInternalJobId(jobId: string) {
  const [tokenId, endpoint, idempotencyKey] = jobId
    .split(":")
    .map(decodeURIComponent);

  return {
    tokenId,
    endpoint,
    idempotencyKey,
  };
}

export function encodeExternalJobId(endpoint: string, idempotencyKey: string) {
  return [endpoint, idempotencyKey].map(encodeURIComponent).join(":");
}

export function decodeExternalJobId(jobId: string) {
  const [endpoint, idempotencyKey] = jobId.split(":").map(decodeURIComponent);

  return {
    endpoint,
    idempotencyKey,
  };
}
