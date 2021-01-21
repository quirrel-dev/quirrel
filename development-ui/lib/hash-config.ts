function fromBase64(v: string): string | null {
  try {
    return atob(v);
  } catch (error) {
    return null;
  }
}

function toBase64(v: string): string {
  return btoa(v);
}

/**
 * Only to be executed client-side.
 */
export function getHashConfig(): Record<string, any> | undefined {
  const { hash } = location;
  if (!hash) {
    return;
  }

  const configPart = hash.slice(1);

  const plain = fromBase64(configPart);
  if (!plain) {
    return;
  }

  try {
    return JSON.parse(plain);
  } catch (error) {
    return;
  }
}

export function configToHash(v: Record<string, any>): string {
  return "#" + toBase64(JSON.stringify(v));
}
