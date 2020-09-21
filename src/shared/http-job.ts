export const HTTP_JOB_QUEUE = "http";

export interface HttpJob {
  body: any;
}

export function encodeInternalJobId(
  tokenId: string,
  endpoint: string,
  customId: string
) {
  return [tokenId, endpoint, customId].map(encodeURIComponent).join(":");
}

export function decodeInternalJobId(jobId: string) {
  const [tokenId, endpoint, customId] = jobId
    .split(":")
    .map(decodeURIComponent);

  return {
    tokenId,
    endpoint,
    customId,
  };
}

export function encodeExternalJobId(endpoint: string, customId: string) {
  return [endpoint, customId].map(encodeURIComponent).join(":");
}

export function decodeExternalJobId(jobId: string) {
  const [endpoint, customId] = jobId.split(":").map(decodeURIComponent);

  return {
    endpoint,
    customId,
  };
}
