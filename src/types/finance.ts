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
  /** Sus gastos chicos cuentan como hormiga (cafe, comer fuera...). Las necesarias (super, internet) no. */
  ant: boolean;
}

export type RecurringFrequency = "monthly" | "yearly";

export interface RecurringRule {
  id: string;
  kind: EntryKind;
  amount: number;
  categoryId: string;
  note: string;
  /** Dia del mes en que se anota (se ajusta a meses cortos). */
  day: number;
  /** Primer mes que se anota. En los anuales, tambien el mes de cada anio. */
  startMonth: MonthKey;
  /** Cada cuanto se anota. Ausente = mensual (reglas guardadas antes de existir los anuales). */
  frequency?: RecurringFrequency;
  /** Ultimo mes ya anotado. null = todavia ninguno. */
  generatedThrough: MonthKey | null;
  active: boolean;
  /**
   * Servicio de un cliente (Clientes) enlazado: el ingreso no se anota por fecha sino cuando se
   * registra el pago, con su monto y su dia reales. null/ausente = fijo normal por dia del mes.
   */
  subscriptionId?: string | null;
  /** Pagos del servicio ya anotados: borrar el movimiento no lo vuelve a importar. */
  importedPaymentIds?: string[];
}

export type RecurringDraft = Pick<RecurringRule, "kind" | "amount" | "categoryId" | "note" | "day" | "startMonth" | "frequency">;

export interface FinanceSettings {
  categories: FinanceCategory[];
  recurring: RecurringRule[];
  /** Id del equipo (src/config/site.ts) de quien usa la boveda: sus clientes se pueden enlazar. */
  teamMemberId: string | null;
  /** Un gasto suelto de hasta este monto (centimos), en una categoria marcada como hormiga, es gasto hormiga. */
  antThreshold: number;
}
