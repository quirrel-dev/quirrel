import { getEncryptionSecret, getApplicationBaseUrl } from "./config";

function checkEncryptionSecret() {
  const encryptionSecret = getEncryptionSecret();

  if (!encryptionSecret) {
    throw new Error("Please specify `QUIRREL_ENCRYPTION_SECRET`.");
  }

  if (encryptionSecret.length !== 32) {
    throw new Error("`QUIRREL_ENCRYPTION_SECRET` must have length 32.");
  }
}

function checkBaseUrl() {
  const baseUrl = getApplicationBaseUrl();
  if (!baseUrl) {
    throw new Error("Please specify `QUIRREL_BASE_URL`.");
  }
}

export function runBuildTimeChecks() {
  checkEncryptionSecret();
  checkBaseUrl();
}
