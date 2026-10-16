import { formatAmount, formatAmountCompact } from "@/lib/finance/money";
import { formatMonth, formatShortMonth } from "@/lib/finance/months";
import type { MonthTotals } from "@/lib/finance/summary";
import type { MonthKey } from "@/types/finance";

interface TrendChartProps {
  totals: MonthTotals[];
  selected: MonthKey;
  onSelect: (month: MonthKey) => void;
}

// Barras dobles (ingresos / gastos) de los ultimos meses. Sin libreria: alturas en % del maximo.
export function TrendChart({ totals, selected, onSelect }: TrendChartProps) {
  const max = Math.max(1, ...totals.flatMap((row) => [row.income, row.expense]));
  const withData = totals.filter((row) => row.income || row.expense);
  const averageExpense = withData.length ? withData.reduce((sum, row) => sum + row.expense, 0) / withData.length : 0;

  return (
    <section className="rounded-[22px] border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_rgba(23,25,23,0.05)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Últimos {totals.length} meses</h2>
        <div className="flex items-center gap-3 text-[11px] font-bold text-[var(--muted-strong)]">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-[#3fae6a]" /> Ingresos</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-[#f08c2e]" /> Gastos</span>
        </div>
      </div>

      <div className="grid h-44 grid-cols-6 items-end gap-1.5 sm:gap-3">
        {totals.map((row) => {
          const isSelected = row.month === selected;
          return (
            <button
              key={row.month}
              type="button"
              onClick={() => onSelect(row.month)}
              aria-pressed={isSelected}
              aria-label={`${formatMonth(row.month)}: ingresos ${formatAmount(row.income)}, gastos ${formatAmount(row.expense)}`}
              title={`Ingresos ${formatAmount(row.income)} · Gastos ${formatAmount(row.expense)}`}
              className={`flex h-full flex-col justify-end rounded-xl px-1 pb-1 pt-2 transition ${isSelected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-muted)]"}`}
            >
              <span className="flex h-full items-end justify-center gap-1">
                <span className="w-full max-w-4 rounded-t-md bg-[#3fae6a] transition-[height] duration-500" style={{ height: `${(row.income / max) * 100}%` }} />
                <span className="w-full max-w-4 rounded-t-md bg-[#f08c2e] transition-[height] duration-500" style={{ height: `${(row.expense / max) * 100}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5 text-center text-[11px] font-extrabold capitalize text-[var(--muted-strong)] sm:gap-3">
        {totals.map((row) => <span key={row.month} className={row.month === selected ? "text-[var(--ink)]" : ""}>{formatShortMonth(row.month)}</span>)}
      </div>

      {averageExpense > 0 && (
        <p className="mt-4 border-t border-[var(--line-soft)] pt-3 text-xs font-bold text-[var(--muted-strong)]">
          Gasto medio por mes: <span className="text-[var(--ink)]">{formatAmountCompact(averageExpense)}</span>
        </p>
      )}
    </section>
  );
}
