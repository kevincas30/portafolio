import { describe, expect, it } from "vitest";
import { invoiceAmounts, quarterOf, suggestWithholding } from "@/lib/autonomo/invoice";
import type { AutonomoSettings } from "@/types/autonomo";

const settings: AutonomoSettings = { activityStart: "2026-11-01", professional: true };

describe("importes de una factura", () => {
  it("calcula IVA, retención y total como el ejemplo de la guía (Quorum, 7%)", () => {
    expect(invoiceAmounts({ base: 90000, vatRate: 21, withholdingRate: 7 })).toEqual({ base: 90000, vat: 18900, withholding: 6300, total: 102600 });
  });

  it("sin retención el total es base + IVA", () => {
    expect(invoiceAmounts({ base: 10000, vatRate: 21, withholdingRate: 0 })).toEqual({ base: 10000, vat: 2100, withholding: 0, total: 12100 });
  });

  it("redondea al céntimo", () => {
    expect(invoiceAmounts({ base: 333, vatRate: 21, withholdingRate: 15 })).toEqual({ base: 333, vat: 70, withholding: 50, total: 353 });
  });
});

describe("retención sugerida", () => {
  it("empresa o autónomo en España: 7% el año de alta y los dos siguientes", () => {
    expect(suggestWithholding({ kind: "issued", counterpartyType: "company", date: "2026-12-01" }, settings)).toBe(7);
    expect(suggestWithholding({ kind: "issued", counterpartyType: "freelancer", date: "2028-12-31" }, settings)).toBe(7);
  });

  it("después del tercer año pasa al 15%", () => {
    expect(suggestWithholding({ kind: "issued", counterpartyType: "company", date: "2029-01-01" }, settings)).toBe(15);
  });

  it("particulares y clientes extranjeros no llevan retención", () => {
    expect(suggestWithholding({ kind: "issued", counterpartyType: "individual", date: "2026-12-01" }, settings)).toBe(0);
    expect(suggestWithholding({ kind: "issued", counterpartyType: "foreign", date: "2026-12-01" }, settings)).toBe(0);
  });

  it("actividad empresarial no lleva retención", () => {
    expect(suggestWithholding({ kind: "issued", counterpartyType: "company", date: "2026-12-01" }, { ...settings, professional: false })).toBe(0);
  });

  it("sin fecha de alta aplica el 15% general", () => {
    expect(suggestWithholding({ kind: "issued", counterpartyType: "company", date: "2026-12-01" }, { ...settings, activityStart: null })).toBe(15);
  });

  it("las facturas recibidas no sugieren retención", () => {
    expect(suggestWithholding({ kind: "received", counterpartyType: "company", date: "2026-12-01" }, settings)).toBe(0);
  });
});

describe("trimestre de una fecha", () => {
  it("agrupa los meses de tres en tres", () => {
    expect(["2026-01-01", "2026-03-31", "2026-04-01", "2026-09-30", "2026-10-01", "2026-12-31"].map(quarterOf)).toEqual([1, 1, 2, 3, 4, 4]);
  });
});
