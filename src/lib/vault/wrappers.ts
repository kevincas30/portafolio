// Armado y apertura de wrappers de la DEK (uno por passkey y uno de recuperacion). Puro: sin red ni DOM.
// El AAD ata cada wrapper a su usuario y a su id, asi el servidor no puede intercambiarlos.
import { aad, deriveKekFromPrf, randomBytes, unwrapDekBytes, wrapDek } from "./crypto";
import { base64ToBytes, bytesToBase64 } from "./encoding";
import { deriveRecoveryKeys, generateRecoverySalt, RECOVERY_KDF_ITERATIONS } from "./recovery";

export interface WrapperRecord {
  id: string;
  /** base64 del salt aleatorio del KDF */
  kdfSalt: string;
  /** null para passkey (HKDF); iteraciones para recuperacion (PBKDF2) */
  kdfIters: number | null;
  iv: string;
  wrappedDek: string;
}

const PASSKEY_SALT_BYTES = 32;

export async function buildPasskeyWrapper(
  dek: Uint8Array,
  prfOutput: Uint8Array,
  userId: string,
): Promise<WrapperRecord> {
  const id = globalThis.crypto.randomUUID();
  const salt = randomBytes(PASSKEY_SALT_BYTES);
  const kek = await deriveKekFromPrf(prfOutput, salt);
  const sealed = await wrapDek(dek, kek, aad.dek(userId, id));
  return { id, kdfSalt: bytesToBase64(salt), kdfIters: null, iv: sealed.iv, wrappedDek: sealed.data };
}

export async function buildRecoveryWrapper(
  dek: Uint8Array,
  code: string,
  userId: string,
  iterations: number = RECOVERY_KDF_ITERATIONS,
): Promise<{ wrapper: WrapperRecord; authToken: string }> {
  const id = globalThis.crypto.randomUUID();
  const salt = generateRecoverySalt();
  const { kek, authToken } = await deriveRecoveryKeys(code, salt, iterations);
  const sealed = await wrapDek(dek, kek, aad.dek(userId, id));
  return {
    wrapper: { id, kdfSalt: bytesToBase64(salt), kdfIters: iterations, iv: sealed.iv, wrappedDek: sealed.data },
    authToken,
  };
}

/** KEK de un wrapper de passkey a partir de la salida PRF. */
export function passkeyKek(wrapper: WrapperRecord, prfOutput: Uint8Array): Promise<CryptoKey> {
  return deriveKekFromPrf(prfOutput, base64ToBytes(wrapper.kdfSalt));
}

/** Abre cualquier wrapper con su KEK. Los bytes son transitorios: el llamador debe importarlos y borrarlos. */
export function openWrapperBytes(wrapper: WrapperRecord, kek: CryptoKey, userId: string): Promise<Uint8Array> {
  return unwrapDekBytes({ data: wrapper.wrappedDek, iv: wrapper.iv }, kek, aad.dek(userId, wrapper.id));
}
