import type { QuirrelInstanceDetails } from "../hooks/useQuirrel";
import { configToHash, getHashConfig } from "./hash-config";
import Encryptor from "secure-e2ee";

export function extendTo32Characters(passphrase: string): string {
  if (passphrase.length > 32) {
    return passphrase.slice(0, 32);
  }

  while (passphrase.length < 32) {
    const missingCharacters = 32 - passphrase.length;
    passphrase += passphrase.slice(0, missingCharacters);
  }

  return passphrase;
}

function getEncryptor(passphrase: string) {
  return new Encryptor(extendTo32Characters(passphrase));
}

async function encrypt(value: string, passphrase: string): Promise<string> {
  const encryptor = getEncryptor(passphrase);
  return encryptor.encrypt(value);
}

async function decrypt(
  value: string,
  passphrase: string
): Promise<string | null> {
  try {
    const encryptor = getEncryptor(passphrase);
    return await encryptor.decrypt(value);
  } catch (error) {
    return null;
  }
}

export async function getConnectionDetailsFromHash(): Promise<
  QuirrelInstanceDetails | undefined
> {
  const config = getHashConfig();
  if (!config) {
    return;
  }

  const { c } = config;
  if (!c) {
    return;
  }

  do {
    const passphrase = window.prompt("Please enter your passphrase.");
    if (!passphrase) {
      return;
    }

    const decrypted = await decrypt(c, passphrase);
    if (!decrypted) {
      continue;
    }

    try {
      return JSON.parse(decrypted);
    } catch (error) {
      return;
    }
  } while (true);
}

function askForPassphrase() {
  do {
    const passphrase = window.prompt(
      "To prevent your credentials from being leaked to your browser history, please enter an encryption passphrase:",
      "min 10 characters"
    );
    if (!passphrase) {
      return;
    }

    if (passphrase.length < 10) {
      continue;
    }

    return passphrase;
  } while (true);
}

export async function connectionDetailsToHash(
  details: QuirrelInstanceDetails
): Promise<string | undefined> {
  const passphrase = askForPassphrase();
  if (!passphrase) {
    return;
  }

  const encryptedDetails = await encrypt(JSON.stringify(details), passphrase);

  return configToHash({
    c: encryptedDetails,
  });
}
