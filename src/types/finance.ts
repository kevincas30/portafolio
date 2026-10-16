// Finanzas personales: todo vive cifrado con la DEK de la boveda del usuario.
// Los montos van en centimos de euro (enteros) para no arrastrar errores de coma flotante.

export type EntryKind = "expense" | "income";

/** Mes como texto comparable: "2026-10". */
export type MonthKey = string;

export interface FinanceEntry {
  id: string;
  kind: EntryKind;
  /** Centimos, siempre positivo: el signo lo da `kind`. */
  amount: number;
  /** "YYYY-MM-DD" */
  date: string;
  categoryId: string;
  note: string;
  /** Gasto fijo que lo genero, si vino de uno. */
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FinanceEntryDraft = Pick<FinanceEntry, "kind" | "amount" | "date" | "categoryId" | "note">;

export interface FinanceCategory {
  id: string;
  name: string;
  kind: EntryKind;
  color: string;
  /** Tope mensual en centimos (solo gastos). null = sin presupuesto. */
  budget: number | null;
  /** Archivada: no aparece para anotar, pero sus movimientos viejos siguen mostrandola. */
  archived: boolean;
}

export interface RecurringRule {
  id: string;
  kind: EntryKind;
  amount: number;
  categoryId: string;
  note: string;
  /** Dia del mes en que se anota (se ajusta a meses cortos). */
  day: number;
  /** Primer mes que se anota. */
  startMonth: MonthKey;
  /** Ultimo mes ya anotado. null = todavia ninguno. */
  generatedThrough: MonthKey | null;
  active: boolean;
}

export type RecurringDraft = Pick<RecurringRule, "kind" | "amount" | "categoryId" | "note" | "day" | "startMonth">;

export interface FinanceSettings {
  categories: FinanceCategory[];
  recurring: RecurringRule[];
  /** Un gasto de hasta este monto (centimos) cuenta como gasto hormiga. */
  antThreshold: number;
}
