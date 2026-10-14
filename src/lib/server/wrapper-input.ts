// Validacion de wrappers recibidos del cliente. El servidor no puede leerlos (estan cifrados),
// pero si exige la forma exacta para no guardar basura: IV de 12 bytes, DEK+tag de 48 bytes.
import { isUuid } from "./http";

export type WrapperKind = "passkey" | "recovery";

export interface WrapperInput {
  id: string;
  kdfSalt: string;
  kdfIters: number | null;
  iv: string;
  wrappedDek: string;
}

export const MIN_RECOVERY_ITERATIONS = 600_000;
const MAX_RECOVERY_ITERATIONS = 2_000_000;
const IV_PATTERN = /^[A-Za-z0-9+/]{16}$/;
const WRAPPED_DEK_PATTERN = /^[A-Za-z0-9+/]{64}$/;
const SALT_PATTERN = /^[A-Za-z0-9+/]{22,88}={0,2}$/;
export const AUTH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function parseWrapper(value: unknown, kind: WrapperKind): WrapperInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!isUuid(input.id)) return null;
  if (typeof input.kdfSalt !== "string" || !SALT_PATTERN.test(input.kdfSalt)) return null;
  if (typeof input.iv !== "string" || !IV_PATTERN.test(input.iv)) return null;
  if (typeof input.wrappedDek !== "string" || !WRAPPED_DEK_PATTERN.test(input.wrappedDek)) return null;

  let kdfIters: number | null = null;
  if (kind === "recovery") {
    if (
      typeof input.kdfIters !== "number" ||
      !Number.isInteger(input.kdfIters) ||
      input.kdfIters < MIN_RECOVERY_ITERATIONS ||
      input.kdfIters > MAX_RECOVERY_ITERATIONS
    ) return null;
    kdfIters = input.kdfIters;
  } else if (input.kdfIters !== null && input.kdfIters !== undefined) {
    return null;
  }
  return { id: input.id, kdfSalt: input.kdfSalt, kdfIters, iv: input.iv, wrappedDek: input.wrappedDek };
}
