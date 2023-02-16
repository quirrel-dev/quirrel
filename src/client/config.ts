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

function normalisedURL(string: string) {
  return prefixWithProtocol(withoutTrailingSlash(string));
}

export function getQuirrelBaseUrl(): string | undefined {
  const fromEnvironment =
    process.env.QUIRREL_API_URL ?? process.env.QUIRREL_URL;
  if (fromEnvironment) {
    return normalisedURL(fromEnvironment);
  }

  return isProduction() ? "https://api.quirrel.dev" : "http://localhost:9181";
}

export function getOldQuirrelBaseUrl(): string | undefined {
  const fromEnvironment =
    process.env.QUIRREL_MIGRATE_OLD_API_URL ?? process.env.QUIRREL_MIGRATE_OLD_URL;
  if (fromEnvironment) {
    return normalisedURL(fromEnvironment);
  }

  return undefined;
}

export function getQuirrelToken(): string | undefined {
  return process.env.QUIRREL_TOKEN;
}

export function getOldQuirrelToken(): string | undefined {
  return process.env.QUIRREL_MIGRATE_OLD_TOKEN;
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

let developmentApplicationPort: number | undefined;

function getNetlifyURL() {
  const siteId = process.env.SITE_ID;
  const netlifyDev = process.env.NETLIFY_DEV;
  const deployUrl = process.env.DEPLOY_URL;
  if (siteId) {
    return siteId + ".netlify.app";
  } else {
    if (netlifyDev) {
      return deployUrl;
    }
  }
}

function getVercelURL() {
  return process.env.VERCEL_URL;
}

export function getApplicationBaseUrl(host = "localhost"): string {
  const baseUrl =
    resolveEnvReference("QUIRREL_BASE_URL") ||
    getNetlifyURL() ||
    getVercelURL() ||
    `http://${host}:${developmentApplicationPort}`;

  if (!baseUrl) {
    throw new Error("Please specify QUIRREL_BASE_URL.");
  }

  return normalisedURL(baseUrl);
}

export function registerDevelopmentDefaults({
  applicationPort,
}: {
  applicationPort: number;
}) {
  if (isProduction()) {
    return;
  }

  if (developmentApplicationPort) {
    return;
  }

  developmentApplicationPort = applicationPort;
}
