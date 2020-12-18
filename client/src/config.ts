export function getQuirrelBaseUrl(): string | undefined {
  const fromEnvironment = process.env.QUIRREL_URL;
  if (fromEnvironment) {
    return fromEnvironment;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://api.quirrel.dev";
  } else {
    return "http://localhost:9181";
  }
}

export function getQuirrelToken(): string | undefined {
  return process.env.QUIRREL_TOKEN;
}

export function getEncryptionSecret() {
  return process.env.QUIRREL_ENCRYPTION_SECRET;
}

export function getOldEncryptionSecrets(): string[] | null {
  return JSON.parse(process.env.QUIRREL_OLD_SECRETS ?? "null");
}

export function getApplicationBaseUrl(): string | undefined {
  const baseUrl = process.env.QUIRREL_BASE_URL;
  if (!baseUrl) {
    return undefined;
  }

  if (baseUrl?.startsWith("http://") || baseUrl?.startsWith("https://")) {
    return baseUrl;
  }

  return "https://" + baseUrl;
}
