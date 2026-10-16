import { Bug, Repeat } from "lucide-react";
import { CategoryDot } from "@/components/finances/FinanceDialog";
import { UNCATEGORIZED_COLOR } from "@/lib/finance/defaults";
import { formatAmount } from "@/lib/finance/money";
import { isAntExpense, type AntRules } from "@/lib/finance/summary";
import { formatLongDate } from "@/lib/dates";
import type { FinanceCategory, FinanceEntry } from "@/types/finance";

interface EntryListProps {
  entries: FinanceEntry[];
  categories: Map<string, FinanceCategory>;
  antRules: AntRules;
  onSelect: (entry: FinanceEntry) => void;
  emptyText: string;
}

/** Movimientos agrupados por dia, del mas nuevo al mas viejo, con el neto de cada dia. */
export function EntryList({ entries, categories, antRules, onSelect, emptyText }: EntryListProps) {
  const days = new Map<string, FinanceEntry[]>();
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  for (const entry of sorted) days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);

  if (sorted.length === 0) {
    return <p className="rounded-[22px] border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm font-semibold text-[var(--muted)]">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {[...days.entries()].map(([date, items]) => {
        const net = items.reduce((sum, item) => sum + (item.kind === "income" ? item.amount : -item.amount), 0);
        return (
          <section key={date}>
            <h3 className="mb-2 flex items-baseline justify-between px-1 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--muted-strong)]">
              <span className="first-letter:uppercase">{formatLongDate(date)}</span>
              <span className="tabular-nums normal-case tracking-normal">{net >= 0 ? "+" : "−"}{formatAmount(Math.abs(net))}</span>
            </h3>
            <ul className="divide-y divide-[var(--line-soft)] overflow-hidden rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface)]">
              {items.map((entry) => {
                const category = categories.get(entry.categoryId);
                const ant = isAntExpense(entry, antRules);
                return (
                  <li key={entry.id}>
                    <button type="button" onClick={() => onSelect(entry)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--surface-muted)]">
                      <CategoryDot color={category?.color ?? UNCATEGORIZED_COLOR} className="size-3" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-[var(--ink)]">{entry.note || category?.name || "Sin categoría"}</span>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
                          {entry.note && <span className="truncate">{category?.name ?? "Sin categoría"}</span>}
                          {entry.recurringId && <span className="inline-flex items-center gap-1"><Repeat aria-hidden="true" className="size-3" /> Fijo</span>}
                          {ant && <span className="inline-flex items-center gap-1 text-[var(--charge-text)]"><Bug aria-hidden="true" className="size-3" /> Hormiga</span>}
                        </span>
                      </span>
                      <span className={`shrink-0 text-sm font-extrabold tabular-nums ${entry.kind === "income" ? "text-[var(--success-text)]" : "text-[var(--ink)]"}`}>
                        {entry.kind === "income" ? "+" : "−"}{formatAmount(entry.amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
