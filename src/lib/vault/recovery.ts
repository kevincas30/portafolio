// Codigo de recuperacion: 160 bits CSPRNG en base32 Crockford, mostrado una sola vez.
// PBKDF2-SHA256 (600k) -> 64 bytes: [0..32] = KEK, [32..64] = authToken (prueba para el servidor).
import { importKek, randomBytes, VaultCryptoError } from "./crypto";
import { base32ToBytes, bytesToBase32, bytesToBase64Url, normalizeBase32, utf8Encode } from "./encoding";

export const RECOVERY_CODE_BYTES = 20;
export const RECOVERY_KDF_ITERATIONS = 600_000;
export const RECOVERY_SALT_BYTES = 16;
const GROUP_SIZE = 4;

/** Genera un codigo nuevo: 32 caracteres en 8 grupos de 4 separados por guion. */
export function generateRecoveryCode(): string {
  const encoded = bytesToBase32(randomBytes(RECOVERY_CODE_BYTES));
  return encoded.match(new RegExp(`.{1,${GROUP_SIZE}}`, "g"))!.join("-");
}

/** Forma canonica (mayusculas, sin guiones/espacios, I/L->1, O->0). Sirve para comparar al confirmar. */
export function normalizeRecoveryCode(input: string): string {
  return normalizeBase32(input);
}

/** Decodifica el codigo tipeado a sus 20 bytes. Lanza si el largo o los caracteres no son validos. */
export function decodeRecoveryCode(input: string): Uint8Array<ArrayBuffer> {
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = base32ToBytes(input);
  } catch {
    throw new VaultCryptoError("INVALID_INPUT", "Codigo de recuperacion invalido");
  }
  if (bytes.length !== RECOVERY_CODE_BYTES) {
    throw new VaultCryptoError("INVALID_INPUT", "Codigo de recuperacion invalido");
  }
  return bytes;
}

export function generateRecoverySalt(): Uint8Array<ArrayBuffer> {
  return randomBytes(RECOVERY_SALT_BYTES);
}

export interface RecoveryKeys {
  kek: CryptoKey;
  /** base64url de 32 bytes. El servidor solo guarda sha256(authToken). */
  authToken: string;
}

export async function deriveRecoveryKeys(
  code: string,
  salt: Uint8Array,
  iterations: number = RECOVERY_KDF_ITERATIONS,
): Promise<RecoveryKeys> {
  const bytes = decodeRecoveryCode(code);
  const material = await globalThis.crypto.subtle.importKey(
    "raw",
    utf8Encode(bytesToBase32(bytes)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = new Uint8Array(
    await globalThis.crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: salt as Uint8Array<ArrayBuffer>, iterations },
      material,
      512,
    ),
  );
  return {
    kek: await importKek(bits.slice(0, 32)),
    authToken: bytesToBase64Url(bits.slice(32, 64)),
  };
}
