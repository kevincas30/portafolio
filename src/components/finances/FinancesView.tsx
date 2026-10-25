import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Lock, Plus, Repeat, Search, Tags } from "lucide-react";
import { CategoriesManager } from "@/components/finances/CategoriesManager";
import { CategoryBreakdown } from "@/components/finances/CategoryBreakdown";
import { EntryForm } from "@/components/finances/EntryForm";
import { EntryList } from "@/components/finances/EntryList";
import { MonthStats } from "@/components/finances/MonthStats";
import { RecurringManager } from "@/components/finances/RecurringManager";
import { TrendChart } from "@/components/finances/TrendChart";
import { headerButtonClass } from "@/components/passwords/PasswordsHeader";
import { Toast } from "@/components/passwords/Toast";
import { formatMonth, monthOf, monthRange, shiftMonth } from "@/lib/finance/months";
import { monthlyFixedExpense } from "@/lib/finance/recurring";
import { antRules, monthSummary, monthTotals } from "@/lib/finance/summary";
import { getTodayKey } from "@/lib/dates";
import type { FinancesController } from "@/hooks/useVaultFinances";
import type { EntryKind, FinanceEntry, MonthKey } from "@/types/finance";

interface FinancesViewProps {
  finances: FinancesController;
  owner: string;
  onLock: () => void;
  headerActions?: ReactNode;
}

type KindFilter = "all" | EntryKind;

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es").trim();
}

const filterOptions: Array<{ id: KindFilter; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "expense", label: "Gastos" },
  { id: "income", label: "Ingresos" },
];

export function FinancesView({ finances, owner, onLock, headerActions }: FinancesViewProps) {
  const today = getTodayKey();
  const currentMonth = monthOf(today);
  const [month, setMonth] = useState<MonthKey>(currentMonth);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ entry?: FinanceEntry } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToast(""), 2_200);
  }, []);

  const { entries, settings } = finances;
  const categoryMap = useMemo(() => new Map(settings.categories.map((category) => [category.id, category])), [settings.categories]);
  const summary = useMemo(() => monthSummary(entries, month, settings, today), [entries, month, settings, today]);
  const previous = useMemo(() => monthSummary(entries, shiftMonth(month, -1), settings, today), [entries, month, settings, today]);
  const ant = useMemo(() => antRules(settings), [settings]);
  const trend = useMemo(() => monthTotals(entries, monthRange(month, 6)), [entries, month]);
  const usedCategoryIds = useMemo(
    () => new Set([...entries.map((entry) => entry.categoryId), ...settings.recurring.map((rule) => rule.categoryId)]),
    [entries, settings.recurring],
  );

  const visibleEntries = useMemo(() => {
    const query = normalizeSearch(search);
    return entries.filter((entry) => {
      if (monthOf(entry.date) !== month) return false;
      if (kindFilter !== "all" && entry.kind !== kindFilter) return false;
      if (categoryFilter && entry.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return normalizeSearch(`${entry.note} ${categoryMap.get(entry.categoryId)?.name ?? ""}`).includes(query);
    });
  }, [entries, month, kindFilter, categoryFilter, search, categoryMap]);

  const selectCategory = (categoryId: string | null) => {
    setCategoryFilter(categoryId);
    if (categoryId) setKindFilter("all");
  };

  // Un movimiento nuevo cae en el mes que se esta mirando: hoy si es el actual, el dia 1 si es otro.
  const defaultDate = month === currentMonth ? today : `${month}-01`;
  const filtered = kindFilter !== "all" || categoryFilter !== null || search.trim() !== "";

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="relative isolate overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#2e3127_0%,#171917_55%,#0e0f0c_100%)] px-5 py-4 text-white shadow-[0_14px_38px_rgba(23,25,23,0.28)] sm:px-7 sm:py-5 lg:px-8">
        <div className="absolute -right-12 -top-20 -z-10 size-52 rounded-full border-[34px] border-[#ffb26b]/10" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold text-white/70">Finanzas de {owner} · cifradas con tu bóveda</p>
            <h1 className="font-display text-[clamp(1.35rem,4.5vw,2rem)] font-bold leading-tight tracking-[-0.03em]">Lo que entra y lo que sale</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {headerActions}
            <button type="button" onClick={onLock} className={headerButtonClass}>
              <Lock aria-hidden="true" className="size-4" /> Bloquear
            </button>
            <button type="button" onClick={() => setRecurringOpen(true)} className={headerButtonClass}>
              <Repeat aria-hidden="true" className="size-4" /> Fijos
            </button>
            <button type="button" onClick={() => setCategoriesOpen(true)} className={headerButtonClass}>
              <Tags aria-hidden="true" className="size-4" /> Categorías
            </button>
            <button type="button" onClick={() => setForm({})} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-[#c9f568] px-3.5 text-xs font-extrabold text-[#171917] shadow-[0_6px_16px_rgba(201,245,104,0.25)] transition hover:bg-[#d5fa83] active:scale-[0.98] sm:text-sm">
              <Plus aria-hidden="true" className="size-4" strokeWidth={2.8} /> Anotar
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior" className="grid size-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <h2 className="min-w-44 text-center text-lg font-extrabold capitalize tracking-[-0.02em] text-[var(--ink)]" aria-live="polite">{formatMonth(month)}</h2>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente" className="grid size-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {finances.loading && <LoaderCircle aria-label="Actualizando" className="size-4 animate-spin text-[var(--muted)]" />}
          {month !== currentMonth && (
            <button type="button" onClick={() => setMonth(currentMonth)} className="min-h-9 rounded-full border border-[var(--line)] px-3.5 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">Este mes</button>
          )}
        </div>
      </div>

      {finances.error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{finances.error}</p>}

      {!finances.ready ? (
        <div className="grid place-items-center py-16 text-[var(--ink)]">
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
          <p className="mt-3 text-sm font-bold">Descifrando tus finanzas…</p>
        </div>
      ) : (
        <>
          <MonthStats summary={summary} previous={previous} antThreshold={settings.antThreshold} fixedExpense={monthlyFixedExpense(settings.recurring)} />

          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryBreakdown rows={summary.expenseByCategory} total={summary.expense} selected={categoryFilter} onSelect={selectCategory} />
            <TrendChart totals={trend} selected={month} onSelect={setMonth} />
          </div>

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="radiogroup" aria-label="Filtrar movimientos" className="inline-flex gap-1 rounded-full bg-[var(--surface-muted)] p-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={kindFilter === option.id}
                    onClick={() => { setKindFilter(option.id); setCategoryFilter(null); }}
                    className={`min-h-9 rounded-full px-4 text-xs font-extrabold transition ${kindFilter === option.id && !categoryFilter ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--muted-strong)] hover:text-[var(--ink)]"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="relative block sm:w-72">
                <span className="sr-only">Buscar movimientos</span>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nota o categoría" className="min-h-10 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] pl-10 pr-4 text-sm font-bold text-[var(--ink)] outline-none placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35" />
              </label>
            </div>
            {categoryFilter && (
              <p className="text-xs font-bold text-[var(--muted-strong)]">
                Solo «{categoryMap.get(categoryFilter)?.name ?? "Sin categoría"}».{" "}
                <button type="button" onClick={() => setCategoryFilter(null)} className="font-extrabold text-[var(--ink)] underline underline-offset-2">Quitar filtro</button>
              </p>
            )}
            <EntryList
              entries={visibleEntries}
              categories={categoryMap}
              antRules={ant}
              onSelect={(entry) => setForm({ entry })}
              emptyText={filtered ? "Nada coincide con el filtro." : "No hay movimientos este mes. Anota el primero con «Anotar»."}
            />
          </section>

          <p className="text-center text-xs font-semibold text-[var(--muted)]">Cifrado en tu navegador con tu bóveda: ni el servidor ni el resto del equipo pueden leerlo.</p>
        </>
      )}

      {form && (
        <EntryForm
          entry={form.entry}
          categories={settings.categories}
          defaultDate={defaultDate}
          onSave={async (draft) => {
            await finances.saveEntry(draft, form.entry);
            showToast(form.entry ? "Movimiento actualizado" : "Movimiento anotado");
          }}
          onDelete={form.entry ? async () => {
            await finances.deleteEntry(form.entry!.id);
            showToast("Movimiento borrado");
          } : undefined}
          onClose={() => setForm(null)}
        />
      )}
      {categoriesOpen && (
        <CategoriesManager
          settings={settings}
          usedCategoryIds={usedCategoryIds}
          onSave={async (next) => {
            await finances.saveSettings(next);
            showToast("Categorías guardadas");
          }}
          onClose={() => setCategoriesOpen(false)}
        />
      )}
      {recurringOpen && (
        <RecurringManager
          rules={settings.recurring}
          categories={settings.categories}
          clients={finances.clients}
          teamMemberId={settings.teamMemberId}
          onSave={finances.saveRecurringRules}
          onCreated={(count) => showToast(count === 1 ? "Se anotó 1 movimiento" : `Se anotaron ${count} movimientos`)}
          onClose={() => setRecurringOpen(false)}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
