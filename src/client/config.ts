function isProduction() {
  if (process.env.VERCEL && process.env.CI) {
    return true;
  }

  return process.env.NODE_ENV === "production";
}

function resolveEnvReference(name: string) {
  const env = process.env[name];

  if (env?.startsWith("@")) {
    const referencedVar = process.env[env.slice(1)];
    return referencedVar;
  }

  return env;
}

export function withoutTrailingSlash(url: string): string {
  if (url.endsWith("/")) {
    return url.slice(0, url.length - 1);
  }

  return url;
}

export function withoutLeadingSlash(url: string): string {
  if (url.startsWith("/")) {
    return url.slice(1);
  }

  return url;
}

export function prefixWithProtocol(string: string): string {
  if (string.startsWith("http://") || string.startsWith("https://")) {
    return string;
  }

  if (isProduction()) {
    return "https://" + string;
  } else {
    return "http://" + string;
  }
}

export function getQuirrelBaseUrl(): string | undefined {
  const fromEnvironment =
    process.env.QUIRREL_API_URL ?? process.env.QUIRREL_URL;
  if (fromEnvironment) {
    return prefixWithProtocol(withoutTrailingSlash(fromEnvironment));
  }

  return isProduction() ? "https://api.quirrel.dev" : "http://localhost:9181";
}

export function getQuirrelToken(): string | undefined {
  return process.env.QUIRREL_TOKEN;
}

export function getEncryptionSecret(): string | undefined {
  return process.env.QUIRREL_ENCRYPTION_SECRET;
}

export function getSignaturePublicKey(): string | undefined {
  return process.env.QUIRREL_SIGNATURE_PUBLIC_KEY;
}

export function getOldEncryptionSecrets(): string[] | null {
  return JSON.parse(process.env.QUIRREL_OLD_SECRETS ?? "null");
}

let developmentApplicationBaseUrl: string | undefined;

export function getApplicationBaseUrl(): string {
  const baseUrl =
    resolveEnvReference("QUIRREL_BASE_URL") || developmentApplicationBaseUrl;

  if (!baseUrl) {
    throw new Error("Please specify QUIRREL_BASE_URL.");
  }

  return prefixWithProtocol(baseUrl);
}

export function registerDevelopmentDefaults({
  applicationBaseUrl,
}: {
  applicationBaseUrl: string;
}) {
  if (isProduction()) {
    return;
  }

  if (developmentApplicationBaseUrl) {
    return;
  }

  developmentApplicationBaseUrl = applicationBaseUrl;
}
