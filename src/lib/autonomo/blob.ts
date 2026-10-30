// Lo que se cifra con la DEK para autonomo. El servidor solo ve `payload` + `payload_iv`.
import { aad, decryptJson, encryptJson, VaultCryptoError, type Sealed } from "@/lib/vault/crypto";
import { defaultAutonomoSettings } from "@/lib/autonomo/invoice";
import { VAT_RATES, WITHHOLDING_RATES, type AutonomoSettings, type Invoice } from "@/types/autonomo";

export const AUTONOMO_BLOB_VERSION = 1;

export type InvoiceBlob = Omit<Invoice, "id" | "createdAt" | "updatedAt">;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTERPARTY_TYPES = new Set(["company", "freelancer", "individual", "foreign"]);

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoError("INVALID_INPUT", "Blob invalido");
  }
  const version = (value as { v?: unknown }).v;
  if (version !== AUTONOMO_BLOB_VERSION) {
    throw new VaultCryptoError("UNSUPPORTED_VERSION", `Version de blob no soportada: ${String(version)}`);
  }
}

const includes = <T>(list: readonly T[], value: unknown): value is T => list.includes(value as T);

export function encodeInvoiceBlob(blob: InvoiceBlob, dek: CryptoKey, userId: string, invoiceId: string): Promise<Sealed> {
  return encryptJson({ ...blob, v: AUTONOMO_BLOB_VERSION }, dek, aad.autonomoInvoice(userId, invoiceId));
}

export async function decodeInvoiceBlob(sealed: Sealed, dek: CryptoKey, userId: string, invoiceId: string): Promise<InvoiceBlob> {
  const raw = await decryptJson<unknown>(sealed, dek, aad.autonomoInvoice(userId, invoiceId));
  assertObject(raw);
  const { kind, number, date, counterparty, counterpartyType, base, vatRate, withholdingRate, deductible, note } = raw;
  const valid = (kind === "issued" || kind === "received")
    && typeof date === "string" && DATE.test(date)
    && typeof counterpartyType === "string" && COUNTERPARTY_TYPES.has(counterpartyType)
    && Number.isInteger(base) && (base as number) >= 0
    && includes(VAT_RATES, vatRate)
    && includes(WITHHOLDING_RATES, withholdingRate);
  if (!valid) throw new VaultCryptoError("INVALID_INPUT", "Factura invalida");
  return {
    kind,
    number: typeof number === "string" ? number : "",
    date,
    counterparty: typeof counterparty === "string" ? counterparty : "",
    counterpartyType: counterpartyType as InvoiceBlob["counterpartyType"],
    base: base as number,
    vatRate,
    withholdingRate,
    deductible: typeof deductible === "boolean" ? deductible : true,
    note: typeof note === "string" ? note : "",
  };
}

export function encodeAutonomoSettings(settings: AutonomoSettings, dek: CryptoKey, userId: string): Promise<Sealed> {
  return encryptJson({ ...settings, v: AUTONOMO_BLOB_VERSION }, dek, aad.autonomoSettings(userId));
}

export async function decodeAutonomoSettings(sealed: Sealed, dek: CryptoKey, userId: string): Promise<AutonomoSettings> {
  const raw = await decryptJson<unknown>(sealed, dek, aad.autonomoSettings(userId));
  assertObject(raw);
  const defaults = defaultAutonomoSettings();
  return {
    activityStart: typeof raw.activityStart === "string" && DATE.test(raw.activityStart) ? raw.activityStart : defaults.activityStart,
    professional: typeof raw.professional === "boolean" ? raw.professional : defaults.professional,
  };
}
