// Primitivas criptograficas del vault por usuario (envelope encryption).
// Puro WebCrypto (globalThis.crypto): corre en el navegador y en Node/vitest.
import { base64ToBytes, bytesToBase64, utf8Decode, utf8Encode } from "./encoding";

export type VaultCryptoErrorCode = "DECRYPT_FAILED" | "INVALID_INPUT" | "UNSUPPORTED_VERSION";

export class VaultCryptoError extends Error {
  readonly code: VaultCryptoErrorCode;
  constructor(code: VaultCryptoErrorCode, message: string) {
    super(message);
    this.name = "VaultCryptoError";
    this.code = code;
  }
}

const IV_BYTES = 12;
const DEK_BYTES = 32;
const HKDF_INFO = "portafolio-vault:kek:v1";
const PRF_SALT_LABEL = "portafolio-vault:prf:v1";

export interface Sealed {
  /** AES-GCM ciphertext + tag, base64 */
  data: string;
  /** IV de 96 bits, base64 */
  iv: string;
}

// AAD: atan cada blob a su usuario/fila/wrapper para que el servidor no pueda intercambiarlos.
export const aad = {
  dek: (userId: string, wrapperId: string) => `dek:v1:${userId}:${wrapperId}`,
  credential: (userId: string, credentialId: string) => `cred:v1:${userId}:${credentialId}`,
  settings: (userId: string) => `settings:v1:${userId}`,
};

function subtle(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

export function generateDek(): Uint8Array<ArrayBuffer> {
  return randomBytes(DEK_BYTES);
}

/** Salt fijo del PRF: SHA-256("portafolio-vault:prf:v1"). Es el input `prf.eval.first`. */
export async function getPrfSalt(): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await subtle().digest("SHA-256", utf8Encode(PRF_SALT_LABEL)));
}

/** KEK = HKDF-SHA256(salida PRF, salt aleatorio por wrapper, info fija). */
export async function deriveKekFromPrf(
  prfOutput: Uint8Array,
  kdfSalt: Uint8Array,
): Promise<CryptoKey> {
  if (prfOutput.length === 0) throw new VaultCryptoError("INVALID_INPUT", "PRF vacio");
  const material = await subtle().importKey("raw", prfOutput as Uint8Array<ArrayBuffer>, "HKDF", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: kdfSalt as Uint8Array<ArrayBuffer>,
      info: utf8Encode(HKDF_INFO),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Importa bytes crudos como KEK AES-GCM (usado por el KDF del codigo de recuperacion). */
export function importKek(raw: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey("raw", raw as Uint8Array<ArrayBuffer>, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function seal(plain: Uint8Array, key: CryptoKey, aadText: string): Promise<Sealed> {
  const iv = randomBytes(IV_BYTES);
  const encrypted = await subtle().encrypt(
    { name: "AES-GCM", iv, additionalData: utf8Encode(aadText) },
    key,
    plain as Uint8Array<ArrayBuffer>,
  );
  return { data: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

async function open(sealed: Sealed, key: CryptoKey, aadText: string): Promise<Uint8Array> {
  try {
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: base64ToBytes(sealed.iv), additionalData: utf8Encode(aadText) },
      key,
      base64ToBytes(sealed.data),
    );
    return new Uint8Array(plain);
  } catch {
    throw new VaultCryptoError("DECRYPT_FAILED", "No se pudo descifrar (clave, IV, datos o AAD incorrectos)");
  }
}

/** Envuelve la DEK cruda con una KEK. Cada llamada usa un IV nuevo. */
export function wrapDek(dek: Uint8Array, kek: CryptoKey, aadText: string): Promise<Sealed> {
  if (dek.length !== DEK_BYTES) throw new VaultCryptoError("INVALID_INPUT", "La DEK debe ser de 32 bytes");
  return seal(dek, kek, aadText);
}

/** Desenvuelve la DEK cruda. Los bytes son transitorios: usar `importDek` enseguida. */
export async function unwrapDekBytes(
  wrapped: Sealed,
  kek: CryptoKey,
  aadText: string,
): Promise<Uint8Array> {
  const dek = await open(wrapped, kek, aadText);
  if (dek.length !== DEK_BYTES) throw new VaultCryptoError("DECRYPT_FAILED", "DEK con largo invalido");
  return dek;
}

/** Importa la DEK como CryptoKey NO extraible (la que vive en memoria del cliente). */
export function importDek(dek: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey("raw", dek as Uint8Array<ArrayBuffer>, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Atajo: unwrap + import no extraible. */
export async function unwrapDek(wrapped: Sealed, kek: CryptoKey, aadText: string): Promise<CryptoKey> {
  const bytes = await unwrapDekBytes(wrapped, kek, aadText);
  try {
    return await importDek(bytes);
  } finally {
    bytes.fill(0);
  }
}

/** Cifra un objeto JSON con la DEK. IV nuevo en cada escritura. */
export function encryptJson(value: unknown, dek: CryptoKey, aadText: string): Promise<Sealed> {
  return seal(utf8Encode(JSON.stringify(value)), dek, aadText);
}

/** Descifra a JSON. Clave/AAD incorrectos o datos alterados -> VaultCryptoError. */
export async function decryptJson<T = unknown>(
  sealed: Sealed,
  dek: CryptoKey,
  aadText: string,
): Promise<T> {
  const plain = await open(sealed, dek, aadText);
  try {
    return JSON.parse(utf8Decode(plain)) as T;
  } catch {
    throw new VaultCryptoError("DECRYPT_FAILED", "Payload no es JSON valido");
  }
}
