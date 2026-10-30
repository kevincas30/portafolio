import { useState, type FormEvent } from "react";
import { LoaderCircle, PiggyBank } from "lucide-react";
import { FinanceDialog, inputClass, labelClass, primaryButtonClass } from "@/components/finances/FinanceDialog";
import { filingDeadline, quarterly130, quarterlyVat, taxSavings } from "@/lib/autonomo/taxes";
import { amountToInput, formatAmount, parseAmount } from "@/lib/finance/money";
import { formatShortDateWithYear } from "@/lib/dates";
import type { AutonomoSettings, Invoice } from "@/types/autonomo";

interface TaxPanelProps {
  invoices: Invoice[];
  settings: AutonomoSettings;
  year: number;
  today: string;
  onSaveSettings: (settings: AutonomoSettings) => Promise<void>;
}

function resultLabel(amount: number, refundable: boolean): string {
  if (amount > 0) return "A ingresar";
  if (amount === 0) return "Sin pago";
  return refundable ? "A devolver o compensar" : "A compensar";
}

export function TaxPanel({ invoices, settings, year, today, onSaveSettings }: TaxPanelProps) {
  const [editing, setEditing] = useState(false);
  const savings = taxSavings(invoices, today, settings.filed);
  const missing = savings.total - settings.setAside;
  const vat = quarterlyVat(invoices, year);
  const irpf = quarterly130(invoices, year);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <section className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted-strong)]">Hucha de impuestos</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-[-0.03em] text-[var(--ink)]">{formatAmount(savings.total)}</p>
            <p className="text-xs font-bold text-[var(--muted-strong)]">a tener apartado hoy</p>
          </div>
          <PiggyBank aria-hidden="true" className="size-7 text-[var(--muted)]" />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm tabular-nums text-[var(--ink)]">
          <dt className="font-bold">IVA (303)</dt><dd className="text-right">{formatAmount(savings.vat)}</dd>
          <dt className="font-bold">IRPF (130)</dt><dd className="text-right">{formatAmount(savings.irpf)}</dd>
          <dt className="font-bold">Ya apartado</dt><dd className="text-right">{formatAmount(settings.setAside)}</dd>
        </dl>
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-extrabold ${missing > 0 ? "bg-[var(--danger-soft)] text-[var(--danger-text)]" : "bg-[var(--success-soft)] text-[var(--success-text)]"}`}>
          {missing > 0 ? `Te falta apartar ${formatAmount(missing)}` : "Cubierto: lo apartado alcanza"}
        </p>
        <button type="button" onClick={() => setEditing(true)} className="mt-3 min-h-10 w-full rounded-full border border-[var(--line)] text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">
          Actualizar lo apartado
        </button>
        <p className="mt-3 text-xs text-[var(--muted-strong)]">Suma el trimestre en curso y el anterior mientras su plazo siga abierto, salvo lo que ya marcaste como presentado. Es una estimación: confírmala con la gestoría.</p>
      </section>

      <section className="overflow-x-auto rounded-[22px] border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[520px] text-sm tabular-nums text-[var(--ink)]">
          <caption className="px-5 pt-4 text-left text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted-strong)]">Modelos trimestrales {year}</caption>
          <thead>
            <tr className="text-left text-xs text-[var(--muted-strong)]">
              <th className="px-5 py-2 font-extrabold">Trimestre</th>
              <th className="px-3 py-2 font-extrabold">303 · IVA</th>
              <th className="px-3 py-2 font-extrabold">130 · IRPF</th>
              <th className="px-5 py-2 font-extrabold">Plazo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {vat.map((row, index) => (
              <tr key={row.quarter}>
                <th scope="row" className="px-5 py-3 text-left font-extrabold">{row.quarter}T</th>
                <td className="px-3 py-3">
                  <span className="block font-extrabold">{formatAmount(Math.abs(row.result))}</span>
                  <span className="block text-xs text-[var(--muted-strong)]">{resultLabel(row.result, row.quarter === 4)}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="block font-extrabold">{formatAmount(Math.abs(irpf[index].result))}</span>
                  <span className="block text-xs text-[var(--muted-strong)]">{resultLabel(irpf[index].result, false)}</span>
                </td>
                <td className="px-5 py-3 text-xs font-bold">{formatShortDateWithYear(filingDeadline(year, row.quarter))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editing && <SetAsideForm settings={settings} onSave={onSaveSettings} onClose={() => setEditing(false)} />}
    </div>
  );
}

function SetAsideForm({ settings, onSave, onClose }: { settings: AutonomoSettings; onSave: (settings: AutonomoSettings) => Promise<void>; onClose: () => void }) {
  const [amount, setAmount] = useState(amountToInput(settings.setAside));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cents = amount.trim() === "" ? 0 : parseAmount(amount);
    if (cents === null) return setError("Escribe un monto válido, por ejemplo 1.250,00.");
    setSubmitting(true);
    try {
      await onSave({ ...settings, setAside: cents });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
      setSubmitting(false);
    }
  };

  return (
    <FinanceDialog eyebrow="Hucha" title="Lo que tienes apartado" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <label className="block">
          <span className={labelClass}>Saldo de la cuenta de impuestos</span>
          <div className="relative">
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" autoFocus className={`${inputClass} pr-10 text-xl tabular-nums`} />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base font-extrabold text-[var(--muted)]">€</span>
          </div>
        </label>
        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}
        <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
          {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />} Guardar
        </button>
      </form>
    </FinanceDialog>
  );
}
