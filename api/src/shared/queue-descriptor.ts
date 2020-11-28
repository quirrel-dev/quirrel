const delimiter = ";";

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
