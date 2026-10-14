// Calendario de pagos de un servicio, reconstruido sin tocar la base:
// cada pago adelanta nextDueDate en `periods` intervalos, asi que los periodos pagados
// son los N inmediatamente anteriores al proximo vencimiento (N = suma de periods).
import { getTodayKey } from "@/lib/dates";
import type { BillingInterval, Subscription } from "@/types/client";

/** paid = cubierto, overdue = vencido sin pagar, due = el proximo a cobrar, idle = nada que mostrar. */
export type PeriodState = "paid" | "overdue" | "due" | "idle";

export interface CalendarCell {
  /** Indice absoluto de mes (anio * 12 + mes 0-11). */
  month: number;
  state: PeriodState;
}

type CalendarSource = Pick<Subscription, "nextDueDate" | "billingInterval" | "active" | "payments">;

const MAX_OPEN_PERIODS = 600;

function parseKey(dateKey: string): { month: number; day: number } {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { month: year * 12 + (month - 1), day };
}

function daysInMonth(month: number): number {
  return new Date(Math.floor(month / 12), (month % 12) + 1, 0).getDate();
}

/** Fecha (comparable como texto) en la que arranca un periodo, con el dia ajustado a meses cortos. */
function periodStartKey(month: number, day: number): string {
  const year = Math.floor(month / 12);
  const clamped = Math.min(day, daysInMonth(month));
  return `${year}-${String((month % 12) + 1).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

function intervalMonths(interval: BillingInterval): number {
  return interval === "monthly" ? 1 : 12;
}

/** Estado de cada periodo indexado por su mes de inicio. */
export function periodStates(source: CalendarSource, todayKey = getTodayKey()): Map<number, PeriodState> {
  const states = new Map<number, PeriodState>();
  const step = intervalMonths(source.billingInterval);
  const due = parseKey(source.nextDueDate);
  const paidPeriods = source.payments.reduce((total, payment) => total + Math.max(0, payment.periods), 0);

  for (let k = 1; k <= paidPeriods; k += 1) states.set(due.month - k * step, "paid");
  if (!source.active) return states;

  // Periodos abiertos desde el vencimiento: los que ya arrancaron estan vencidos; el primero que no, se cobra.
  for (let k = 0; k < MAX_OPEN_PERIODS; k += 1) {
    const month = due.month + k * step;
    if (periodStartKey(month, due.day) < todayKey) {
      states.set(month, "overdue");
      continue;
    }
    states.set(month, "due");
    break;
  }
  return states;
}

/** Los 12 meses de un anio para un servicio mensual. */
export function monthCells(source: CalendarSource, year: number, todayKey = getTodayKey()): CalendarCell[] {
  const states = periodStates(source, todayKey);
  return Array.from({ length: 12 }, (_, index) => {
    const month = year * 12 + index;
    return { month, state: states.get(month) ?? "idle" };
  });
}

/** Un casillero por anio para un servicio anual: desde el primer periodo pagado hasta el proximo cobro. */
export function yearCells(source: CalendarSource, todayKey = getTodayKey(), maxYears = 6): CalendarCell[] {
  const states = periodStates(source, todayKey);
  // Todos los periodos anuales caen en el mismo mes, asi que avanzar de a 12 no se saltea ninguno.
  const months = [...states.keys(), parseKey(source.nextDueDate).month];
  const first = Math.min(...months);
  const last = Math.max(...months);
  const cells: CalendarCell[] = [];
  for (let month = first; month <= last; month += 12) {
    cells.push({ month, state: states.get(month) ?? "idle" });
  }
  return cells.slice(-maxYears);
}

export interface PaymentCoverage {
  /** Primer dia cubierto. */
  from: string;
  /** Dia en que vence el periodo siguiente (no incluido). */
  until: string;
}

/**
 * Periodo que cubre cada pago. Los pagos llegan del mas nuevo al mas viejo (como los devuelve la API):
 * el mas nuevo cubre los ultimos periodos antes de nextDueDate, y asi hacia atras.
 */
export function paymentCoverage(source: Pick<Subscription, "nextDueDate" | "billingInterval" | "payments">): Map<string, PaymentCoverage> {
  const step = intervalMonths(source.billingInterval);
  const due = parseKey(source.nextDueDate);
  const coverage = new Map<string, PaymentCoverage>();
  let covered = 0;
  for (const payment of source.payments) {
    const periods = Math.max(0, payment.periods);
    coverage.set(payment.id, {
      from: periodStartKey(due.month - (covered + periods) * step, due.day),
      until: periodStartKey(due.month - covered * step, due.day),
    });
    covered += periods;
  }
  return coverage;
}

/** Anio inicial del calendario mensual: el actual. */
export function currentYear(todayKey = getTodayKey()): number {
  return Math.floor(parseKey(todayKey).month / 12);
}
