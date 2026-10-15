import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentYear, monthCells, yearCells, type CalendarCell, type PeriodState } from "@/lib/payment-calendar";
import { subscriptionTypeLabel } from "@/config/subscription-types";
import { addDays, addInterval, formatMediumDate, formatShortDateWithYear } from "@/lib/dates";
import type { Subscription } from "@/types/client";

const stateClasses: Record<PeriodState, string> = {
  paid: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]",
  overdue: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-text)]",
  due: "border-[var(--charge-border)] bg-[var(--charge-soft)] text-[var(--charge-text)]",
  idle: "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted)]",
};

const stateLabels: Record<PeriodState, string> = {
  paid: "Pagado",
  overdue: "Vencido sin pagar",
  due: "Por cobrar",
  idle: "Sin pago",
};

const legend: PeriodState[] = ["paid", "overdue", "due"];

const shortMonth = new Intl.DateTimeFormat("es-ES", { month: "short" });
const longMonth = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

function cellDate(cell: CalendarCell): Date {
  return new Date(Math.floor(cell.month / 12), cell.month % 12, 1, 12);
}

function Cell({ cell, text, description }: { cell: CalendarCell; text: string; description: string }) {
  const label = `${description}: ${stateLabels[cell.state]}`;
  return (
    <li
      title={label}
      aria-label={label}
      className={`grid min-h-9 place-items-center rounded-lg border px-1 text-[11px] font-extrabold capitalize ${stateClasses[cell.state]}`}
    >
      {text}
    </li>
  );
}

/** Que pasa con el periodo anual de ese casillero, con su fecha de cobro. */
function chargeDetail(cell: CalendarCell): string {
  switch (cell.state) {
    case "paid":
      return `Pagado: cubre del ${formatShortDateWithYear(cell.start)} al ${formatShortDateWithYear(addDays(addInterval(cell.start, "yearly"), -1))}.`;
    case "overdue":
      return `Venció el ${formatMediumDate(cell.start)} y está sin pagar.`;
    case "due":
      return `Se cobra el ${formatMediumDate(cell.start)}.`;
    default:
      return `Se cobraría el ${formatMediumDate(cell.start)}.`;
  }
}

function YearCells({ cells }: { cells: CalendarCell[] }) {
  // Arranca mostrando el anio a cobrar (o el ultimo) para que la fecha se vea sin tocar nada.
  const [selected, setSelected] = useState(() => (cells.find((cell) => cell.state === "due") ?? cells.at(-1))?.month ?? null);
  const active = cells.find((cell) => cell.month === selected);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {cells.map((cell) => {
          const label = String(Math.floor(cell.month / 12));
          const isSelected = cell.month === selected;
          return (
            <li key={cell.month}>
              <button
                type="button"
                onClick={() => setSelected(cell.month)}
                aria-pressed={isSelected}
                title={`${label}: ${stateLabels[cell.state]}`}
                className={`grid min-h-9 w-full place-items-center rounded-lg border px-1 text-[11px] font-extrabold transition ${stateClasses[cell.state]} ${isSelected ? "ring-2 ring-[var(--ink)] ring-offset-1 ring-offset-[var(--surface-soft)]" : "hover:brightness-95"}`}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
      {active && (
        <p aria-live="polite" className="mt-2.5 text-xs font-bold text-[var(--ink)]">{chargeDetail(active)}</p>
      )}
    </>
  );
}

export function PaymentCalendar({ subscription }: { subscription: Subscription }) {
  const [year, setYear] = useState(() => currentYear());
  const monthly = subscription.billingInterval === "monthly";
  const title = `${subscriptionTypeLabel(subscription.type)}${subscription.label ? ` · ${subscription.label}` : ""}`;

  return (
    <section aria-label={`Calendario de pagos: ${title}`} className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4">
      <p className="mb-3 truncate text-sm font-extrabold text-[var(--ink)]">{title}</p>
      {monthly ? (
        <>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYear((current) => current - 1)} aria-label="Año anterior" className="grid size-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <span className="text-xs font-extrabold text-[var(--ink)]">{year}</span>
            <button type="button" onClick={() => setYear((current) => current + 1)} aria-label="Año siguiente" className="grid size-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {monthCells(subscription, year).map((cell) => (
              <Cell key={cell.month} cell={cell} text={shortMonth.format(cellDate(cell)).replace(".", "")} description={longMonth.format(cellDate(cell))} />
            ))}
          </ul>
        </>
      ) : (
        <YearCells cells={yearCells(subscription)} />
      )}

      <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {legend.map((state) => (
          <li key={state} className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]">
            <span aria-hidden="true" className={`size-2.5 rounded-sm border ${stateClasses[state]}`} />
            {stateLabels[state]}
          </li>
        ))}
      </ul>
    </section>
  );
}
