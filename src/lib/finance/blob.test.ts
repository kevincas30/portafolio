import { describe, expect, it } from "vitest";
import { decodeEntryBlob, decodeFinanceSettings, encodeEntryBlob, encodeFinanceSettings, type EntryBlob } from "@/lib/finance/blob";
import { defaultFinanceSettings } from "@/lib/finance/defaults";
import { aad, encryptJson, generateDek, importDek, VaultCryptoError } from "@/lib/vault/crypto";

const blob: EntryBlob = { kind: "expense", amount: 350, date: "2026-10-16", categoryId: "cafe", note: "Cortado", recurringId: null };

describe("blob de finanzas", () => {
  it("cifra y descifra un movimiento", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encodeEntryBlob(blob, dek, "u1", "e1");
    expect(sealed.data).not.toContain("Cortado");
    expect(await decodeEntryBlob(sealed, dek, "u1", "e1")).toEqual(blob);
  });

  it("no se puede mover un movimiento a otra fila ni a otro usuario (AAD)", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encodeEntryBlob(blob, dek, "u1", "e1");
    await expect(decodeEntryBlob(sealed, dek, "u1", "e2")).rejects.toBeInstanceOf(VaultCryptoError);
    await expect(decodeEntryBlob(sealed, dek, "u2", "e1")).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("rechaza un movimiento con forma invalida", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encryptJson({ v: 1, kind: "robo", amount: 1, date: "2026-10-16" }, dek, aad.financeEntry("u1", "e1"));
    await expect(decodeEntryBlob(sealed, dek, "u1", "e1")).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("cifra y descifra los ajustes, completando lo que falte", async () => {
    const dek = await importDek(generateDek());
    const settings = defaultFinanceSettings();
    expect(await decodeFinanceSettings(await encodeFinanceSettings(settings, dek, "u1"), dek, "u1")).toEqual(settings);

    const partial = await encryptJson({ v: 1, categories: [] }, dek, aad.financeSettings("u1"));
    expect(await decodeFinanceSettings(partial, dek, "u1")).toEqual({ categories: [], recurring: [], antThreshold: 1000 });
  });
});
