// Gastos e ingresos fijos: cada regla anota un movimiento por mes cuando llega su dia.
// `generatedThrough` recuerda el ultimo mes anotado, asi que borrar un movimiento generado no lo vuelve a crear.
import { dateInMonth, monthOf, shiftMonth } from "@/lib/finance/months";
import type { FinanceEntry, RecurringRule } from "@/types/finance";

/** Si la boveda estuvo meses sin abrirse, no se anotan mas de 2 anios de golpe. */
export const MAX_CATCH_UP_MONTHS = 24;

export type PendingEntry = Omit<FinanceEntry, "createdAt" | "updatedAt">;

export interface RecurringRun {
  entries: PendingEntry[];
  /** Reglas con `generatedThrough` avanzado. Solo cambia si hay entradas nuevas. */
  rules: RecurringRule[];
}

/** Movimientos que las reglas activas deberian haber anotado hasta hoy y todavia no anotaron. */
export function runRecurring(rules: RecurringRule[], todayKey: string, newId: () => string): RecurringRun {
  const currentMonth = monthOf(todayKey);
  const entries: PendingEntry[] = [];
  const updated = rules.map((rule) => {
    if (!rule.active) return rule;
    let month = rule.generatedThrough ? shiftMonth(rule.generatedThrough, 1) : rule.startMonth;
    let last = rule.generatedThrough;
    for (let step = 0; step < MAX_CATCH_UP_MONTHS && month <= currentMonth; step += 1) {
      const date = dateInMonth(month, rule.day);
      if (date > todayKey) break;
      entries.push({
        id: newId(),
        kind: rule.kind,
        amount: rule.amount,
        date,
        categoryId: rule.categoryId,
        note: rule.note,
        recurringId: rule.id,
      });
      last = month;
      month = shiftMonth(month, 1);
    }
    return last === rule.generatedThrough ? rule : { ...rule, generatedThrough: last };
  });
  return { entries, rules: updated };
}

/** Proxima fecha en que la regla va a anotar algo. */
export function nextRecurringDate(rule: RecurringRule): string {
  const month = rule.generatedThrough ? shiftMonth(rule.generatedThrough, 1) : rule.startMonth;
  return dateInMonth(month, rule.day);
}

/** Total mensual comprometido en gastos fijos activos. */
export function monthlyFixedExpense(rules: RecurringRule[]): number {
  return rules.filter((rule) => rule.active && rule.kind === "expense").reduce((total, rule) => total + rule.amount, 0);
}
