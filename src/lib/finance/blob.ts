// Lo que se cifra con la DEK para finanzas. El servidor solo ve `payload` + `payload_iv`:
// ni montos, ni fechas, ni categorias viajan en claro.
import { aad, decryptJson, encryptJson, VaultCryptoError, type Sealed } from "@/lib/vault/crypto";
import { defaultFinanceSettings, DEFAULT_ANT_THRESHOLD } from "@/lib/finance/defaults";
import type { FinanceEntry, FinanceSettings } from "@/types/finance";

export const FINANCE_BLOB_VERSION = 1;

export type EntryBlob = Pick<FinanceEntry, "kind" | "amount" | "date" | "categoryId" | "note" | "recurringId">;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoError("INVALID_INPUT", "Blob invalido");
  }
  const version = (value as { v?: unknown }).v;
  if (version !== FINANCE_BLOB_VERSION) {
    throw new VaultCryptoError("UNSUPPORTED_VERSION", `Version de blob no soportada: ${String(version)}`);
  }
}

export function encodeEntryBlob(blob: EntryBlob, dek: CryptoKey, userId: string, entryId: string): Promise<Sealed> {
  return encryptJson({ ...blob, v: FINANCE_BLOB_VERSION }, dek, aad.financeEntry(userId, entryId));
}

export async function decodeEntryBlob(sealed: Sealed, dek: CryptoKey, userId: string, entryId: string): Promise<EntryBlob> {
  const raw = await decryptJson<unknown>(sealed, dek, aad.financeEntry(userId, entryId));
  assertObject(raw);
  const { kind, amount, date, categoryId, note, recurringId } = raw;
  if ((kind !== "expense" && kind !== "income") || !Number.isInteger(amount) || typeof date !== "string" || !DATE.test(date)) {
    throw new VaultCryptoError("INVALID_INPUT", "Movimiento invalido");
  }
  return {
    kind,
    amount: amount as number,
    date,
    categoryId: typeof categoryId === "string" ? categoryId : "",
    note: typeof note === "string" ? note : "",
    recurringId: typeof recurringId === "string" ? recurringId : null,
  };
}

export function encodeFinanceSettings(settings: FinanceSettings, dek: CryptoKey, userId: string): Promise<Sealed> {
  return encryptJson({ ...settings, v: FINANCE_BLOB_VERSION }, dek, aad.financeSettings(userId));
}

export async function decodeFinanceSettings(sealed: Sealed, dek: CryptoKey, userId: string): Promise<FinanceSettings> {
  const raw = await decryptJson<unknown>(sealed, dek, aad.financeSettings(userId));
  assertObject(raw);
  const defaults = defaultFinanceSettings();
  return {
    categories: Array.isArray(raw.categories) ? (raw.categories as FinanceSettings["categories"]) : defaults.categories,
    recurring: Array.isArray(raw.recurring) ? (raw.recurring as FinanceSettings["recurring"]) : [],
    antThreshold: Number.isInteger(raw.antThreshold) ? (raw.antThreshold as number) : DEFAULT_ANT_THRESHOLD,
  };
}
