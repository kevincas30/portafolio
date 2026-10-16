// Numeros del mes a partir de los movimientos ya descifrados (todo se calcula en el navegador).
import { daysInMonth, monthOf } from "@/lib/finance/months";
import type { EntryKind, FinanceCategory, FinanceEntry, FinanceSettings, MonthKey } from "@/types/finance";

export type BudgetState = "ok" | "warn" | "over";

/** Avisa al llegar al 80 % del presupuesto. */
export const BUDGET_WARN_RATIO = 0.8;

export interface CategoryTotal {
  categoryId: string;
  /** null si la categoria ya no existe. */
  category: FinanceCategory | null;
  total: number;
  count: number;
  budget: number | null;
  /** Gastado / presupuesto. null sin presupuesto. */
  ratio: number | null;
}

export interface MonthSummary {
  month: MonthKey;
  income: number;
  expense: number;
  balance: number;
  /** Gastos chicos sueltos (no fijos) de categorias hormiga, hasta el umbral de los ajustes. */
  ant: { count: number; total: number };
  /** Gasto medio por dia transcurrido del mes. */
  dailyAverage: number;
  /** Si el mes esta en curso: gasto al ritmo actual hasta fin de mes. */
  projectedExpense: number | null;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
}

export function budgetState(ratio: number | null): BudgetState {
  if (ratio === null || ratio < BUDGET_WARN_RATIO) return "ok";
  return ratio > 1 ? "over" : "warn";
}

export interface AntRules {
  threshold: number;
  categoryIds: Set<string>;
}

export function antRules(settings: Pick<FinanceSettings, "antThreshold" | "categories">): AntRules {
  return {
    threshold: settings.antThreshold,
    categoryIds: new Set(settings.categories.filter((category) => category.kind === "expense" && category.ant).map((category) => category.id)),
  };
}

/** Hormiga = gasto suelto (no fijo), chico y de una categoria evitable. El internet de 10 € no lo es. */
export function isAntExpense(entry: Pick<FinanceEntry, "kind" | "amount" | "recurringId" | "categoryId">, rules: AntRules): boolean {
  return entry.kind === "expense" && entry.recurringId === null && entry.amount <= rules.threshold && rules.categoryIds.has(entry.categoryId);
}

function byCategory(entries: FinanceEntry[], kind: EntryKind, categories: FinanceCategory[]): CategoryTotal[] {
  const lookup = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, { total: number; count: number }>();
  for (const entry of entries) {
    if (entry.kind !== kind) continue;
    const current = totals.get(entry.categoryId) ?? { total: 0, count: 0 };
    totals.set(entry.categoryId, { total: current.total + entry.amount, count: current.count + 1 });
  }
  // Las categorias con presupuesto aparecen aunque no tengan gastos: asi se ve cuanto queda.
  if (kind === "expense") {
    for (const category of categories) {
      if (category.kind === "expense" && !category.archived && category.budget && !totals.has(category.id)) {
        totals.set(category.id, { total: 0, count: 0 });
      }
    }
  }
  return [...totals.entries()]
    .map(([categoryId, { total, count }]) => {
      const category = lookup.get(categoryId) ?? null;
      const budget = kind === "expense" ? category?.budget ?? null : null;
      return { categoryId, category, total, count, budget, ratio: budget ? total / budget : null };
    })
    .sort((a, b) => b.total - a.total || (b.budget ?? 0) - (a.budget ?? 0));
}

/** Dias del mes que ya pasaron (incluido hoy): todo si es pasado, 0 si es futuro. */
function elapsedDays(month: MonthKey, todayKey: string): number {
  const current = monthOf(todayKey);
  if (month < current) return daysInMonth(month);
  if (month > current) return 0;
  return Number(todayKey.slice(8, 10));
}

export function monthSummary(entries: FinanceEntry[], month: MonthKey, settings: FinanceSettings, todayKey: string): MonthSummary {
  const inMonth = entries.filter((entry) => monthOf(entry.date) === month);
  let income = 0;
  let expense = 0;
  const ant = { count: 0, total: 0 };
  const rules = antRules(settings);
  for (const entry of inMonth) {
    if (entry.kind === "income") income += entry.amount;
    else expense += entry.amount;
    if (isAntExpense(entry, rules)) {
      ant.count += 1;
      ant.total += entry.amount;
    }
  }

  const days = elapsedDays(month, todayKey);
  const isCurrent = month === monthOf(todayKey);
  return {
    month,
    income,
    expense,
    balance: income - expense,
    ant,
    dailyAverage: days ? Math.round(expense / days) : 0,
    projectedExpense: isCurrent && days ? Math.round((expense / days) * daysInMonth(month)) : null,
    expenseByCategory: byCategory(inMonth, "expense", settings.categories),
    incomeByCategory: byCategory(inMonth, "income", settings.categories),
  };
}

export interface MonthTotals {
  month: MonthKey;
  income: number;
  expense: number;
}

/** Ingresos y gastos de cada mes pedido (para el grafico de evolucion). */
export function monthTotals(entries: FinanceEntry[], months: MonthKey[]): MonthTotals[] {
  const totals = new Map(months.map((month) => [month, { month, income: 0, expense: 0 }]));
  for (const entry of entries) {
    const row = totals.get(monthOf(entry.date));
    if (!row) continue;
    if (entry.kind === "income") row.income += entry.amount;
    else row.expense += entry.amount;
  }
  return months.map((month) => totals.get(month)!);
}

/** Variacion relativa contra el mes anterior. null si antes no habia nada con que comparar. */
export function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}
