// Forma de lo que el servidor acepta de una credencial cifrada. Solo `name` viaja en claro.
import { isUuid } from "./http";

export interface SealedInput {
  payload: string;
  payloadIv: string;
}

export interface CredentialInput extends SealedInput {
  id: string;
  name: string;
}

export const NAME_MAX = 200;
export const PAYLOAD_MAX = 100_000;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const IV_PATTERN = /^[A-Za-z0-9+/]{16}$/;

export function parseSealed(value: unknown): SealedInput | null {
  if (!value || typeof value !== "object") return null;
  const { payload, payloadIv } = value as Record<string, unknown>;
  if (typeof payload !== "string" || payload.length === 0 || payload.length > PAYLOAD_MAX || !BASE64.test(payload)) return null;
  if (typeof payloadIv !== "string" || !IV_PATTERN.test(payloadIv)) return null;
  return { payload, payloadIv };
}

export function parseCredentialInput(value: unknown): CredentialInput | null {
  if (!value || typeof value !== "object") return null;
  const { id, name } = value as Record<string, unknown>;
  const sealed = parseSealed(value);
  if (!sealed || !isUuid(id) || typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > NAME_MAX) return null;
  // Cualquier otro campo del body (incluido user_id) se ignora a proposito.
  return { id, name: trimmed, ...sealed };
}
