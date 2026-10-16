// Meses como "YYYY-MM": se comparan como texto y sirven de clave.
import type { MonthKey } from "@/types/finance";

export function monthOf(dateKey: string): MonthKey {
  return dateKey.slice(0, 7);
}

function parts(month: MonthKey): [number, number] {
  const [year, monthNumber] = month.split("-").map(Number);
  return [year, monthNumber];
}

export function shiftMonth(month: MonthKey, amount: number): MonthKey {
  const [year, monthNumber] = parts(month);
  const index = year * 12 + (monthNumber - 1) + amount;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: MonthKey): number {
  const [year, monthNumber] = parts(month);
  return new Date(year, monthNumber, 0).getDate();
}

/** Fecha de un dia del mes, ajustada a meses cortos (el 31 de febrero pasa a ser el 28 o el 29). */
export function dateInMonth(month: MonthKey, day: number): string {
  return `${month}-${String(Math.min(Math.max(1, day), daysInMonth(month))).padStart(2, "0")}`;
}

/** Los ultimos `count` meses terminando en `last`, del mas viejo al mas nuevo. */
export function monthRange(last: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(last, index - count + 1));
}

const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const shortMonthFormatter = new Intl.DateTimeFormat("es-ES", { month: "short" });

function toDate(month: MonthKey): Date {
  const [year, monthNumber] = parts(month);
  return new Date(year, monthNumber - 1, 15);
}

/** "octubre de 2026" */
export function formatMonth(month: MonthKey): string {
  return monthFormatter.format(toDate(month));
}

/** "oct" */
export function formatShortMonth(month: MonthKey): string {
  return shortMonthFormatter.format(toDate(month)).replace(".", "");
}
