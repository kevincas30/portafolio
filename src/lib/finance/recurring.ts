// Gastos e ingresos fijos: cada regla anota un movimiento por mes (o por anio) cuando llega su dia.
// `generatedThrough` recuerda el ultimo mes anotado, asi que borrar un movimiento generado no lo vuelve a crear.
import { dateInMonth, monthOf, shiftMonth } from "@/lib/finance/months";
import type { FinanceEntry, MonthKey, RecurringFrequency, RecurringRule } from "@/types/finance";

/**
 * Si la boveda estuvo meses sin abrirse, no se anotan mas de 24 movimientos por regla de golpe
 * (2 anios de un mensual). Es un tope de cantidad, no de tiempo: un anual atrasado se pone al dia entero.
 */
export const MAX_CATCH_UP_MONTHS = 24;

export type PendingEntry = Omit<FinanceEntry, "createdAt" | "updatedAt">;

export interface RecurringRun {
  entries: PendingEntry[];
  /** Reglas con `generatedThrough` avanzado. Solo cambia si hay entradas nuevas. */
  rules: RecurringRule[];
}

/** Meses entre un movimiento y el siguiente. */
export function intervalMonths(rule: RecurringRule): number {
  return rule.frequency === "yearly" ? 12 : 1;
}

/** Primer mes que la regla todavia no anoto. */
function nextMonth(rule: RecurringRule): MonthKey {
  return rule.generatedThrough ? shiftMonth(rule.generatedThrough, intervalMonths(rule)) : rule.startMonth;
}

/** Movimientos que las reglas activas deberian haber anotado hasta hoy y todavia no anotaron. */
export function runRecurring(rules: RecurringRule[], todayKey: string, newId: () => string): RecurringRun {
  const currentMonth = monthOf(todayKey);
  const entries: PendingEntry[] = [];
  const updated = rules.map((rule) => {
    // Los enlazados a un servicio de cliente se anotan al registrar el pago (client-income.ts).
    if (!rule.active || rule.subscriptionId) return rule;
    const interval = intervalMonths(rule);
    let month = nextMonth(rule);
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
      month = shiftMonth(month, interval);
    }
    return last === rule.generatedThrough ? rule : { ...rule, generatedThrough: last };
  });
  return { entries, rules: updated };
}

/** Proxima fecha en que la regla va a anotar algo. */
export function nextRecurringDate(rule: RecurringRule): string {
  return dateInMonth(nextMonth(rule), rule.day);
}

/** Total mensual comprometido en gastos fijos activos. Los anuales cuentan un doceavo. */
export function monthlyFixedExpense(rules: RecurringRule[]): number {
  const active = rules.filter((rule) => rule.active && rule.kind === "expense" && !rule.subscriptionId);
  const total = (frequency: RecurringFrequency) => active
    .filter((rule) => (rule.frequency ?? "monthly") === frequency)
    .reduce((sum, rule) => sum + rule.amount, 0);
  return total("monthly") + Math.round(total("yearly") / 12);
}

/**
 * Reanudar una regla pausada no anota lo que vencio durante la pausa: sigue desde el mes en curso
 * (un anual salta al proximo aniversario que no haya pasado).
 */
export function resumeRule(rule: RecurringRule, todayKey: string): RecurringRule {
  const currentMonth = monthOf(todayKey);
  const interval = intervalMonths(rule);
  let month = nextMonth(rule);
  if (month >= currentMonth) return { ...rule, active: true };
  while (month < currentMonth) month = shiftMonth(month, interval);
  return { ...rule, active: true, generatedThrough: shiftMonth(month, -interval) };
}
