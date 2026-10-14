import type { VaultConfiguration } from "@/types/credential";

const KDF_ITERATIONS = 310_000;
const VAULT_VERIFIER = "clientes-panel-vault:v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const PLAINTEXT_PASSWORD_IV = "plaintext:v1";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveVaultKey(
  masterPassword: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return globalThis.crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptText(value: string, key: CryptoKey) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

export async function createVaultConfiguration(masterPassword: string): Promise<{
  configuration: VaultConfiguration;
  key: CryptoKey;
}> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveVaultKey(masterPassword, salt, KDF_ITERATIONS);
  const verifier = await encryptText(VAULT_VERIFIER, key);

  return {
    key,
    configuration: {
      salt: bytesToBase64(salt),
      verifierCiphertext: verifier.ciphertext,
      verifierIv: verifier.iv,
      kdfIterations: KDF_ITERATIONS,
    },
  };
}

export async function unlockVault(
  masterPassword: string,
  configuration: VaultConfiguration,
): Promise<CryptoKey> {
  const key = await deriveVaultKey(
    masterPassword,
    base64ToBytes(configuration.salt),
    configuration.kdfIterations,
  );

  try {
    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(configuration.verifierIv) },
      key,
      base64ToBytes(configuration.verifierCiphertext),
    );
    if (decoder.decode(decrypted) !== VAULT_VERIFIER) throw new Error("Invalid verifier");
  } catch {
    throw new Error("La contraseña maestra no es correcta.");
  }

  return key;
}

export async function encryptPassword(password: string, key: CryptoKey) {
  if (!password) return { encryptedPassword: null, passwordIv: null };
  const result = await encryptText(password, key);
  return { encryptedPassword: result.ciphertext, passwordIv: result.iv };
}

export async function decryptPassword(
  encryptedPassword: string,
  passwordIv: string,
  key: CryptoKey | null,
): Promise<string> {
  if (passwordIv === PLAINTEXT_PASSWORD_IV) return encryptedPassword;
  if (!key) throw new Error("Esta contraseña todavía necesita migrarse.");
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(passwordIv) },
    key,
    base64ToBytes(encryptedPassword),
  );
  return decoder.decode(decrypted);
}
