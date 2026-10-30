// Modelos trimestrales (303 y 130) a partir del libro de facturas. Es una estimacion para preparar
// el trimestre y apartar el dinero: lo que se presenta lo confirma la gestoria.
import { invoiceAmounts, quarterOf, type Quarter } from "@/lib/autonomo/invoice";
import { taxRules } from "@/lib/autonomo/tax-rules";
import type { Invoice } from "@/types/autonomo";

const QUARTERS: Quarter[] = [1, 2, 3, 4];

export interface VatQuarter {
  quarter: Quarter;
  /** IVA repercutido en las facturas emitidas. */
  accrued: number;
  /** IVA soportado deducible de las facturas recibidas. */
  deductible: number;
  /** Cuotas negativas de trimestres anteriores que se restan en este. */
  compensated: number;
  /** A ingresar si es positivo; a compensar (o a devolver en el 4T) si es negativo. */
  result: number;
}

const inYear = (invoices: Invoice[], year: number) => invoices.filter((invoice) => invoice.date.startsWith(`${year}-`));
const counts = (invoice: Invoice) => invoice.kind === "issued" || invoice.deductible;

export function quarterlyVat(invoices: Invoice[], year: number): VatQuarter[] {
  const yearInvoices = inYear(invoices, year).filter(counts);
  let pending = 0;
  return QUARTERS.map((quarter) => {
    let accrued = 0;
    let deductible = 0;
    for (const invoice of yearInvoices) {
      if (quarterOf(invoice.date) !== quarter) continue;
      const { vat } = invoiceAmounts(invoice);
      if (invoice.kind === "issued") accrued += vat;
      else deductible += vat;
    }
    const raw = accrued - deductible;
    const compensated = raw > 0 ? Math.min(pending, raw) : 0;
    pending = pending - compensated + (raw < 0 ? -raw : 0);
    return { quarter, accrued, deductible, compensated, result: raw - compensated };
  });
}

interface YieldTotals {
  income: number;
  /** Gastos deducibles mas los de dificil justificacion (casilla 02). */
  expenses: number;
  netYield: number;
  withholdings: number;
}

/** Rendimiento acumulado del 1 de enero al cierre del trimestre (o del año, con quarter = 4). */
function yieldThrough(invoices: Invoice[], year: number, quarter: Quarter): YieldTotals {
  const rules = taxRules(year);
  let income = 0;
  let deductibleExpenses = 0;
  let withholdings = 0;
  for (const invoice of inYear(invoices, year).filter(counts)) {
    if (quarterOf(invoice.date) > quarter) continue;
    if (invoice.kind === "issued") {
      income += invoice.base;
      withholdings += invoiceAmounts(invoice).withholding;
    } else {
      deductibleExpenses += invoice.base;
    }
  }
  const before = income - deductibleExpenses;
  const difficult = before > 0 ? Math.min(Math.round(before * rules.difficultExpensesRate), rules.difficultExpensesCap) : 0;
  const expenses = deductibleExpenses + difficult;
  return { income, expenses, netYield: income - expenses, withholdings };
}

/** Minoracion por trimestre (casilla 13). Sin actividad el año anterior, el rendimiento cuenta como cero. */
function quarterlyReduction(invoices: Invoice[], year: number): number {
  const previous = yieldThrough(invoices, year - 1, 4).netYield;
  return taxRules(year).reductionTiers.find((tier) => previous <= tier.upTo)?.amount ?? 0;
}

export interface IrpfQuarter extends YieldTotals {
  quarter: Quarter;
  /** Casilla 04: 20% del rendimiento positivo. */
  gross: number;
  /** Casilla 05: pagos positivos (casilla 07) de trimestres anteriores. */
  previousPayments: number;
  /** Casilla 13. */
  reduction: number;
  /** Casilla 15: resultados negativos de trimestres anteriores que se restan en este. */
  compensated: number;
  /** Casilla 19: a ingresar si es positivo; si es negativo se resta en los siguientes. */
  result: number;
}

export function quarterly130(invoices: Invoice[], year: number): IrpfQuarter[] {
  const rules = taxRules(year);
  const reduction = quarterlyReduction(invoices, year);
  let previousPayments = 0;
  let pendingNegative = 0;
  return QUARTERS.map((quarter) => {
    const totals = yieldThrough(invoices, year, quarter);
    const gross = totals.netYield > 0 ? Math.round(totals.netYield * rules.paymentRate) : 0;
    const box07 = gross - previousPayments - totals.withholdings;
    const box14 = box07 - reduction;
    const compensated = box14 > 0 ? Math.min(pendingNegative, box14) : 0;
    const result = box14 - compensated;
    const row = { quarter, ...totals, gross, previousPayments, reduction, compensated, result };
    if (box07 > 0) previousPayments += box07;
    pendingNegative = pendingNegative - compensated + (result < 0 ? -result : 0);
    return row;
  });
}

/** Ultimo dia para presentar el 303 y el 130 de un trimestre (guia, pag. 07). */
export function filingDeadline(year: number, quarter: Quarter): string {
  if (quarter === 4) return `${year + 1}-01-30`;
  return `${year}-${String(quarter * 3 + 1).padStart(2, "0")}-20`;
}

export interface QuarterRef {
  year: number;
  quarter: Quarter;
}

/** Trimestres sin presentar a hoy: el anterior mientras su plazo siga abierto y el que esta en curso. */
export function pendingQuarters(today: string): QuarterRef[] {
  const year = Number(today.slice(0, 4));
  const quarter = quarterOf(today);
  const previous: QuarterRef = quarter === 1 ? { year: year - 1, quarter: 4 } : { year, quarter: (quarter - 1) as Quarter };
  const current: QuarterRef = { year, quarter };
  return filingDeadline(previous.year, previous.quarter) >= today ? [previous, current] : [current];
}

export interface TaxSavings {
  vat: number;
  irpf: number;
  total: number;
}

/**
 * Lo que hay que tener apartado hoy: el IVA y el 130 a ingresar de los trimestres pendientes.
 * Un modelo ya presentado (`303-2026-3` en `filed`) ya salio de la cuenta y no cuenta.
 */
export function taxSavings(invoices: Invoice[], today: string, filed: string[] = []): TaxSavings {
  const done = new Set(filed);
  let vat = 0;
  let irpf = 0;
  for (const { year, quarter } of pendingQuarters(today)) {
    if (!done.has(`303-${year}-${quarter}`)) vat += Math.max(0, quarterlyVat(invoices, year)[quarter - 1].result);
    if (!done.has(`130-${year}-${quarter}`)) irpf += Math.max(0, quarterly130(invoices, year)[quarter - 1].result);
  }
  return { vat, irpf, total: vat + irpf };
}
