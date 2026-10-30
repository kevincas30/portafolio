import { describe, expect, it } from "vitest";
import { decodeAutonomoSettings, decodeInvoiceBlob, encodeAutonomoSettings, encodeInvoiceBlob, type InvoiceBlob } from "@/lib/autonomo/blob";
import { defaultAutonomoSettings } from "@/lib/autonomo/invoice";
import { aad, encryptJson, generateDek, importDek, VaultCryptoError } from "@/lib/vault/crypto";

const blob: InvoiceBlob = {
  kind: "issued",
  number: "2026-001",
  date: "2026-11-15",
  counterparty: "Quorum",
  counterpartyType: "company",
  base: 90000,
  vatRate: 21,
  withholdingRate: 7,
  deductible: true,
  note: "50% inicial",
};

describe("blob de facturas de autónomo", () => {
  it("cifra y descifra una factura", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encodeInvoiceBlob(blob, dek, "u1", "i1");
    expect(sealed.data).not.toContain("Quorum");
    expect(await decodeInvoiceBlob(sealed, dek, "u1", "i1")).toEqual(blob);
  });

  it("no se puede mover una factura a otra fila ni a otro usuario (AAD)", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encodeInvoiceBlob(blob, dek, "u1", "i1");
    await expect(decodeInvoiceBlob(sealed, dek, "u1", "i2")).rejects.toBeInstanceOf(VaultCryptoError);
    await expect(decodeInvoiceBlob(sealed, dek, "u2", "i1")).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("no acepta un blob de gastos como factura", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encryptJson({ ...blob, v: 1 }, dek, aad.financeEntry("u1", "i1"));
    await expect(decodeInvoiceBlob(sealed, dek, "u1", "i1")).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("rechaza una factura con forma inválida", async () => {
    const dek = await importDek(generateDek());
    for (const bad of [{ kind: "robo" }, { base: -1 }, { base: 1.5 }, { vatRate: 18 }, { withholdingRate: 9 }, { date: "15/11/2026" }, { counterpartyType: "otro" }]) {
      const sealed = await encryptJson({ ...blob, ...bad, v: 1 }, dek, aad.autonomoInvoice("u1", "i1"));
      await expect(decodeInvoiceBlob(sealed, dek, "u1", "i1")).rejects.toBeInstanceOf(VaultCryptoError);
    }
  });

  it("cifra y descifra los ajustes, completando lo que falte", async () => {
    const dek = await importDek(generateDek());
    const settings = { activityStart: "2026-11-01", professional: false, setAside: 123_450 };
    expect(await decodeAutonomoSettings(await encodeAutonomoSettings(settings, dek, "u1"), dek, "u1")).toEqual(settings);

    const partial = await encryptJson({ v: 1 }, dek, aad.autonomoSettings("u1"));
    expect(await decodeAutonomoSettings(partial, dek, "u1")).toEqual(defaultAutonomoSettings());
  });
});

describe("ajustes de autónomo", () => {
  it("lo apartado tiene que ser un entero no negativo", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encryptJson({ v: 1, setAside: -5 }, dek, aad.autonomoSettings("u1"));
    expect((await decodeAutonomoSettings(sealed, dek, "u1")).setAside).toBe(0);
  });
});
