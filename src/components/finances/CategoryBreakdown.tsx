import { CategoryDot } from "@/components/finances/FinanceDialog";
import { UNCATEGORIZED_COLOR } from "@/lib/finance/defaults";
import { formatAmount } from "@/lib/finance/money";
import { budgetState, type CategoryTotal } from "@/lib/finance/summary";

interface CategoryBreakdownProps {
  rows: CategoryTotal[];
  total: number;
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

const percent = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 0 });

const barTone = { ok: "", warn: "bg-[#e8b931]", over: "bg-[var(--danger)]" } as const;

export function CategoryBreakdown({ rows, total, selected, onSelect }: CategoryBreakdownProps) {
  return (
    <section className="rounded-[22px] border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_rgba(23,25,23,0.05)] sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Gastos por categoría</h2>
        {selected && (
          <button type="button" onClick={() => onSelect(null)} className="text-xs font-extrabold text-[var(--muted-strong)] underline-offset-2 hover:underline">Ver todas</button>
        )}
      </div>

      {rows.length === 0 && <p className="py-6 text-center text-sm font-semibold text-[var(--muted)]">Todavía no hay gastos este mes.</p>}

      <ul className="space-y-1">
        {rows.map((row) => {
          const state = budgetState(row.ratio);
          const color = row.category?.color ?? UNCATEGORIZED_COLOR;
          const width = row.budget ? Math.min(row.ratio ?? 0, 1) : total ? row.total / total : 0;
          const isSelected = selected === row.categoryId;
          return (
            <li key={row.categoryId}>
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : row.categoryId)}
                aria-pressed={isSelected}
                className={`w-full rounded-2xl px-3 py-2.5 text-left transition ${isSelected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-muted)]"}`}
              >
                <span className="flex items-center gap-2">
                  <CategoryDot color={color} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--ink)]">{row.category?.name ?? "Sin categoría"}</span>
                  <span className="text-sm font-extrabold tabular-nums text-[var(--ink)]">{formatAmount(row.total)}</span>
                </span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <span className={`block h-full rounded-full transition-[width] duration-500 ${barTone[state]}`} style={{ width: `${Math.max(width * 100, row.total ? 2 : 0)}%`, backgroundColor: state === "ok" ? color : undefined }} />
                </span>
                <span className="mt-1.5 flex justify-between gap-2 text-[11px] font-bold text-[var(--muted-strong)]">
                  <span>{row.count} {row.count === 1 ? "movimiento" : "movimientos"}</span>
                  {row.budget ? (
                    <span className={state === "over" ? "text-[var(--danger-text)]" : state === "warn" ? "text-[var(--warning-text)]" : ""}>
                      {state === "over"
                        ? `Te pasaste ${formatAmount(row.total - row.budget)} de ${formatAmount(row.budget)}`
                        : `Quedan ${formatAmount(row.budget - row.total)} de ${formatAmount(row.budget)}`}
                    </span>
                  ) : (
                    <span>{total ? percent.format(row.total / total) : ""} del gasto</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
