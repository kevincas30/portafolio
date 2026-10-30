import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Lock, Plus, Settings2 } from "lucide-react";
import { AutonomoSettingsForm } from "@/components/autonomo/AutonomoSettingsForm";
import { counterpartyLabels, InvoiceForm } from "@/components/autonomo/InvoiceForm";
import { headerButtonClass } from "@/components/passwords/PasswordsHeader";
import { invoiceAmounts, quarterOf, type Quarter } from "@/lib/autonomo/invoice";
import { formatAmount } from "@/lib/finance/money";
import { formatShortDate, getTodayKey } from "@/lib/dates";
import type { AutonomoController } from "@/hooks/useVaultAutonomo";
import type { Invoice, InvoiceKind } from "@/types/autonomo";

interface AutonomoViewProps {
  autonomo: AutonomoController;
  owner: string;
  onLock: () => void;
  headerActions?: ReactNode;
}

type KindFilter = "all" | InvoiceKind;

const filters: { id: KindFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "issued", label: "Emitidas" },
  { id: "received", label: "Recibidas" },
];

const QUARTERS: Quarter[] = [4, 3, 2, 1];

export function AutonomoView({ autonomo, owner, onLock, headerActions }: AutonomoViewProps) {
  const today = getTodayKey();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [form, setForm] = useState<{ invoice?: Invoice } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const byQuarter = useMemo(() => {
    const groups = new Map<Quarter, Invoice[]>();
    const visible = autonomo.invoices
      .filter((invoice) => invoice.date.startsWith(`${year}-`) && (kindFilter === "all" || invoice.kind === kindFilter))
      .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
    for (const invoice of visible) {
      const quarter = quarterOf(invoice.date);
      groups.set(quarter, [...(groups.get(quarter) ?? []), invoice]);
    }
    return groups;
  }, [autonomo.invoices, year, kindFilter]);

  // Una factura nueva cae en el año que se esta mirando: hoy si es el actual, el 1 de enero si es otro.
  const defaultDate = year === currentYear ? today : `${year}-01-01`;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="relative isolate overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#2e3127_0%,#171917_55%,#0e0f0c_100%)] px-5 py-4 text-white shadow-[0_14px_38px_rgba(23,25,23,0.28)] sm:px-7 sm:py-5 lg:px-8">
        <div className="absolute -right-12 -top-20 -z-10 size-52 rounded-full border-[34px] border-[#8fd3ff]/10" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold text-white/70">Autónomo de {owner} · cifrado con tu bóveda</p>
            <h1 className="font-display text-[clamp(1.35rem,4.5vw,2rem)] font-bold leading-tight tracking-[-0.03em]">Facturas e impuestos</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {headerActions}
            <button type="button" onClick={onLock} className={headerButtonClass}>
              <Lock aria-hidden="true" className="size-4" /> Bloquear
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} className={headerButtonClass}>
              <Settings2 aria-hidden="true" className="size-4" /> Mi actividad
            </button>
            <button type="button" onClick={() => setForm({})} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-[#c9f568] px-3.5 text-xs font-extrabold text-[#171917] shadow-[0_6px_16px_rgba(201,245,104,0.25)] transition hover:bg-[#d5fa83] active:scale-[0.98] sm:text-sm">
              <Plus aria-hidden="true" className="size-4" strokeWidth={2.8} /> Registrar factura
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setYear(year - 1)} aria-label="Año anterior" className="grid size-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <h2 className="min-w-20 text-center text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)]" aria-live="polite">{year}</h2>
          <button type="button" onClick={() => setYear(year + 1)} aria-label="Año siguiente" className="grid size-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
          {autonomo.loading && <LoaderCircle aria-label="Actualizando" className="ml-2 size-4 animate-spin text-[var(--muted)]" />}
        </div>
        <div role="radiogroup" aria-label="Filtrar facturas" className="flex gap-1 rounded-full bg-[var(--surface-muted)] p-1">
          {filters.map((filter) => (
            <button key={filter.id} type="button" role="radio" aria-checked={kindFilter === filter.id} onClick={() => setKindFilter(filter.id)} className={`min-h-9 rounded-full px-3.5 text-xs font-extrabold transition ${kindFilter === filter.id ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--muted-strong)] hover:text-[var(--ink)]"}`}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {autonomo.error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{autonomo.error}</p>}

      {!autonomo.ready ? (
        <div className="grid place-items-center py-16 text-[var(--ink)]">
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
          <p className="mt-3 text-sm font-bold">Descifrando tus facturas…</p>
        </div>
      ) : byQuarter.size === 0 ? (
        <p className="rounded-[22px] border border-dashed border-[var(--line)] px-5 py-10 text-center text-sm font-bold text-[var(--muted-strong)]">
          No hay facturas registradas en {year}. Registra las que emites con tu generador y las que recibes de tus gastos.
        </p>
      ) : (
        QUARTERS.filter((quarter) => byQuarter.has(quarter)).map((quarter) => (
          <section key={quarter} className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted-strong)]">{quarter}T {year}</h3>
            <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)]">
              {byQuarter.get(quarter)!.map((invoice) => {
                const amounts = invoiceAmounts(invoice);
                return (
                  <li key={invoice.id}>
                    <button type="button" onClick={() => setForm({ invoice })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-muted)] sm:px-5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold text-[var(--ink)]">
                          {invoice.counterparty}{invoice.number && <span className="font-bold text-[var(--muted-strong)]"> · {invoice.number}</span>}
                        </span>
                        <span className="block text-xs text-[var(--muted-strong)]">
                          {formatShortDate(invoice.date)} · {invoice.kind === "issued" ? "Emitida" : "Recibida"} · {counterpartyLabels[invoice.counterpartyType]}
                          {invoice.withholdingRate > 0 && ` · Ret. ${invoice.withholdingRate}%`}
                          {invoice.kind === "received" && !invoice.deductible && " · No deducible"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className={`block text-sm font-extrabold ${invoice.kind === "issued" ? "text-[var(--success-text)]" : "text-[var(--ink)]"}`}>{formatAmount(amounts.total)}</span>
                        <span className="block text-xs text-[var(--muted-strong)]">Base {formatAmount(amounts.base)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {form && (
        <InvoiceForm
          invoice={form.invoice}
          settings={autonomo.settings}
          defaultDate={defaultDate}
          onSave={(draft) => autonomo.saveInvoice(draft, form.invoice)}
          onDelete={form.invoice ? () => autonomo.deleteInvoice(form.invoice!.id) : undefined}
          onClose={() => setForm(null)}
        />
      )}
      {settingsOpen && <AutonomoSettingsForm settings={autonomo.settings} onSave={autonomo.saveSettings} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
