import type { AutonomoSettings, Invoice, WithholdingRate } from "@/types/autonomo";

/** Años con retencion reducida: el del alta y los dos siguientes (guia, pag. 04). */
const REDUCED_WITHHOLDING_YEARS = 3;

export function defaultAutonomoSettings(): AutonomoSettings {
  return { activityStart: null, epigrafe: "", professional: true, setAside: 0, filed: [], roadmapDone: [] };
}

export interface InvoiceAmounts {
  base: number;
  vat: number;
  withholding: number;
  /** Lo que paga el cliente: base + IVA - retencion. */
  total: number;
}

export function invoiceAmounts({ base, vatRate, withholdingRate }: Pick<Invoice, "base" | "vatRate" | "withholdingRate">): InvoiceAmounts {
  const vat = Math.round((base * vatRate) / 100);
  const withholding = Math.round((base * withholdingRate) / 100);
  return { base, vat, withholding, total: base + vat - withholding };
}

/**
 * Retencion que deberia llevar una factura emitida: solo actividad profesional facturando a una
 * empresa o autonomo en España. Es una sugerencia: el formulario deja cambiarla.
 */
export function suggestWithholding(
  invoice: Pick<Invoice, "kind" | "counterpartyType" | "date">,
  settings: AutonomoSettings,
): WithholdingRate {
  if (invoice.kind !== "issued" || !settings.professional) return 0;
  if (invoice.counterpartyType !== "company" && invoice.counterpartyType !== "freelancer") return 0;
  if (!settings.activityStart) return 15;
  const years = Number(invoice.date.slice(0, 4)) - Number(settings.activityStart.slice(0, 4));
  return years < REDUCED_WITHHOLDING_YEARS ? 7 : 15;
}

export type Quarter = 1 | 2 | 3 | 4;

/** Trimestre fiscal de una fecha YYYY-MM-DD (el que se declara en el 303 y el 130). */
export function quarterOf(date: string): Quarter {
  return (Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1) as Quarter;
}
