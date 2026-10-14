// Envoltorio de @simplewebauthn/browser con PRF. Reglas del spike:
// - La libreria no convierte base64url -> buffer en `extensions`: ponemos prf.eval.first (Uint8Array) aqui.
// - clientExtensionResults vuelve crudo (ArrayBuffer): se extrae el PRF y se quita antes de enviar el JSON.
// - La salida PRF y las claves derivadas NUNCA salen del navegador.
import {
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { getPrfSalt, randomBytes } from "./crypto";
import { bytesToBase64Url } from "./encoding";

export type PasskeyErrorCode = "CANCELLED" | "FAILED";

export class PasskeyError extends Error {
  readonly code: PasskeyErrorCode;
  constructor(code: PasskeyErrorCode, message: string) {
    super(message);
    this.name = "PasskeyError";
    this.code = code;
  }
}

function toPasskeyError(reason: unknown): PasskeyError {
  if (reason instanceof PasskeyError) return reason;
  if (reason instanceof Error && reason.name === "NotAllowedError") {
    return new PasskeyError("CANCELLED", "Cancelaste la operación o se agotó el tiempo.");
  }
  if (reason instanceof Error && reason.name === "InvalidStateError") {
    return new PasskeyError("FAILED", "Esta passkey ya está registrada en este dispositivo.");
  }
  return new PasskeyError("FAILED", "No se pudo completar la operación con la passkey.");
}

interface ClientResults {
  prf?: { enabled?: boolean; results?: { first?: BufferSource } };
}

/** Salida PRF (`prf.results.first`) como bytes, o null si el autenticador no la dio. */
export function extractPrfFirst(clientExtensionResults: unknown): Uint8Array | null {
  const first = (clientExtensionResults as ClientResults | undefined)?.prf?.results?.first;
  if (!first) return null;
  const bytes = ArrayBuffer.isView(first)
    ? new Uint8Array(first.buffer, first.byteOffset, first.byteLength)
    : new Uint8Array(first);
  return bytes.length > 0 ? new Uint8Array(bytes) : null;
}

/** Deja solo `prf.enabled` en clientExtensionResults: el servidor no necesita (ni debe ver) nada mas. */
export function sanitizeResponse<T extends { clientExtensionResults?: unknown }>(response: T): T {
  const enabled = (response.clientExtensionResults as ClientResults | undefined)?.prf?.enabled;
  return { ...response, clientExtensionResults: enabled === undefined ? {} : { prf: { enabled } } };
}

async function withPrfEval<T extends { extensions?: object }>(options: T): Promise<T> {
  const first = await getPrfSalt();
  return { ...options, extensions: { ...options.extensions, prf: { eval: { first } } } };
}

export interface PasskeyRegistration {
  /** Respuesta lista para enviar al servidor (sin la salida PRF). */
  response: RegistrationResponseJSON;
  /** Salida PRF, o null si el autenticador no la ofrece (el codigo de recuperacion sera el unico acceso). */
  prfFirst: Uint8Array | null;
}

export interface PasskeyAssertion {
  response: AuthenticationResponseJSON;
  prfFirst: Uint8Array | null;
}

export async function getAssertion(options: PublicKeyCredentialRequestOptionsJSON): Promise<PasskeyAssertion> {
  try {
    const response = await startAuthentication({ optionsJSON: await withPrfEval(options) });
    return { response: sanitizeResponse(response), prfFirst: extractPrfFirst(response.clientExtensionResults) };
  } catch (reason) {
    throw toPasskeyError(reason);
  }
}

/**
 * Crea la passkey pidiendo PRF. Safari puede no devolver la salida en create(): si el
 * autenticador no declara `prf.enabled === false`, hace un get() inmediato con la passkey nueva.
 */
export async function createPasskey(options: PublicKeyCredentialCreationOptionsJSON): Promise<PasskeyRegistration> {
  let response: RegistrationResponseJSON;
  try {
    response = await startRegistration({ optionsJSON: await withPrfEval(options) });
  } catch (reason) {
    throw toPasskeyError(reason);
  }

  let prfFirst = extractPrfFirst(response.clientExtensionResults);
  const enabled = (response.clientExtensionResults as ClientResults | undefined)?.prf?.enabled;
  if (!prfFirst && enabled !== false) {
    const followUp = await getAssertion({
      // Challenge local: solo se usa para obtener el PRF, la respuesta se descarta.
      challenge: bytesToBase64Url(randomBytes(32)),
      rpId: options.rp.id,
      allowCredentials: [{ id: response.id, type: "public-key", transports: response.response.transports }],
      userVerification: "required",
    });
    prfFirst = followUp.prfFirst;
  }
  return { response: sanitizeResponse(response), prfFirst };
}
