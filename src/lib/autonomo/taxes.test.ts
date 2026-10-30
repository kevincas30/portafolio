import { describe, expect, it } from "vitest";
import { filingDeadline, pendingQuarters, quarterly130, quarterlyVat, taxSavings } from "@/lib/autonomo/taxes";
import type { Invoice, InvoiceDraft } from "@/types/autonomo";

let seq = 0;
function invoice(patch: Partial<InvoiceDraft> & Pick<InvoiceDraft, "date" | "base">): Invoice {
  seq += 1;
  return {
    id: `i${seq}`,
    kind: "issued",
    number: "",
    counterparty: "Cliente",
    counterpartyType: "company",
    vatRate: 0,
    withholdingRate: 0,
    deductible: true,
    note: "",
    createdAt: "",
    updatedAt: "",
    ...patch,
  };
}

/** Un año anterior con rendimientos altos: sin minoración en el 130. */
const busyPriorYear = [invoice({ date: "2025-06-01", base: 2_000_000 })];

describe("modelo 303 (IVA trimestral)", () => {
  it("IVA repercutido menos soportado deducible, compensando trimestres negativos", () => {
    const invoices = [
      invoice({ date: "2026-02-01", base: 100_000, vatRate: 21 }),
      invoice({ date: "2026-03-01", kind: "received", base: 23_810, vatRate: 21 }),
      invoice({ date: "2026-03-02", kind: "received", base: 50_000, vatRate: 21, deductible: false }),
      invoice({ date: "2026-05-01", kind: "received", base: 38_095, vatRate: 21 }),
      invoice({ date: "2026-08-01", base: 47_619, vatRate: 21 }),
      invoice({ date: "2026-11-01", kind: "received", base: 14_286, vatRate: 21 }),
    ];
    expect(quarterlyVat(invoices, 2026)).toEqual([
      { quarter: 1, accrued: 21_000, deductible: 5_000, compensated: 0, result: 16_000 },
      { quarter: 2, accrued: 0, deductible: 8_000, compensated: 0, result: -8_000 },
      { quarter: 3, accrued: 10_000, deductible: 0, compensated: 8_000, result: 2_000 },
      { quarter: 4, accrued: 0, deductible: 3_000, compensated: 0, result: -3_000 },
    ]);
  });
});

describe("modelo 130 (pago fraccionado de IRPF)", () => {
  it("20% del rendimiento acumulado menos pagos anteriores y retenciones", () => {
    const invoices = [...busyPriorYear, invoice({ date: "2026-01-15", base: 300_000 }), invoice({ date: "2026-04-15", base: 300_000, withholdingRate: 15 })];
    const [q1, q2] = quarterly130(invoices, 2026);
    expect(q1).toMatchObject({ income: 300_000, expenses: 15_000, netYield: 285_000, gross: 57_000, previousPayments: 0, withholdings: 0, result: 57_000 });
    expect(q2).toMatchObject({ income: 600_000, expenses: 30_000, netYield: 570_000, gross: 114_000, previousPayments: 57_000, withholdings: 45_000, result: 12_000 });
  });

  it("los gastos de difícil justificación son el 5% con tope de 2.000 € al año", () => {
    const [, , , q4] = quarterly130([...busyPriorYear, invoice({ date: "2026-10-01", base: 5_000_000 })], 2026);
    expect(q4.expenses).toBe(200_000);
  });

  it("solo cuentan los gastos recibidos deducibles, por su base", () => {
    const invoices = [
      ...busyPriorYear,
      invoice({ date: "2026-01-10", base: 100_000 }),
      invoice({ date: "2026-01-11", kind: "received", base: 20_000, vatRate: 21 }),
      invoice({ date: "2026-01-12", kind: "received", base: 50_000, deductible: false }),
    ];
    expect(quarterly130(invoices, 2026)[0]).toMatchObject({ income: 100_000, expenses: 24_000, netYield: 76_000 });
  });

  it("sin actividad el año anterior resta 100 € por trimestre y arrastra los negativos", () => {
    const invoices = [invoice({ date: "2026-02-01", kind: "received", base: 50_000 }), invoice({ date: "2026-05-01", base: 300_000 })];
    const [q1, q2, q3] = quarterly130(invoices, 2026);
    expect(q1).toMatchObject({ netYield: -50_000, gross: 0, reduction: 10_000, compensated: 0, result: -10_000 });
    expect(q2).toMatchObject({ netYield: 237_500, gross: 47_500, reduction: 10_000, compensated: 10_000, result: 27_500 });
    expect(q3).toMatchObject({ previousPayments: 47_500, reduction: 10_000, compensated: 0, result: -10_000 });
  });

  it("la minoración baja por tramos según el rendimiento del año anterior", () => {
    // 2025: 10.526,32 € de ingresos − 5% = 10.000 € → tramo de 75 €.
    const invoices = [invoice({ date: "2025-03-01", base: 1_052_632 }), invoice({ date: "2026-01-10", base: 1_000_000 })];
    expect(quarterly130(invoices, 2026)[0].reduction).toBe(7_500);
  });
});

describe("plazos y hucha", () => {
  it("del 1 al 20 del mes siguiente al trimestre, y hasta el 30 de enero el cuarto", () => {
    expect([1, 2, 3, 4].map((quarter) => filingDeadline(2026, quarter as 1 | 2 | 3 | 4))).toEqual(["2026-04-20", "2026-07-20", "2026-10-20", "2027-01-30"]);
  });

  it("pendientes: el trimestre en curso y el anterior mientras su plazo siga abierto", () => {
    expect(pendingQuarters("2026-10-10")).toEqual([{ year: 2026, quarter: 3 }, { year: 2026, quarter: 4 }]);
    expect(pendingQuarters("2026-10-21")).toEqual([{ year: 2026, quarter: 4 }]);
    expect(pendingQuarters("2027-01-30")).toEqual([{ year: 2026, quarter: 4 }, { year: 2027, quarter: 1 }]);
  });

  it("a apartar: IVA y 130 positivos de los trimestres pendientes", () => {
    const invoices = [
      ...busyPriorYear,
      invoice({ date: "2026-08-01", base: 100_000, vatRate: 21 }),
      invoice({ date: "2026-10-05", base: 100_000, vatRate: 21, withholdingRate: 15 }),
    ];
    // 3T: IVA 210 + 130 (20% de 950) 190. 4T: IVA 210 + 130 (20% de 1.900 − 190 − 150) 40.
    expect(taxSavings(invoices, "2026-10-10")).toEqual({ vat: 42_000, irpf: 23_000, total: 65_000 });
  });
});

describe("hucha con trimestres presentados", () => {
  it("lo ya presentado sale de la hucha", () => {
    const invoices = [...busyPriorYear, invoice({ date: "2026-08-01", base: 100_000, vatRate: 21 })];
    expect(taxSavings(invoices, "2026-10-10", ["303-2026-3"])).toEqual({ vat: 0, irpf: 19_000, total: 19_000 });
  });
});
