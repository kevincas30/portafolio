import { useEffect, useState, type FormEvent } from "react";
import { CalendarCheck2, CircleDollarSign, LoaderCircle, X } from "lucide-react";
import { subscriptionTypeLabel } from "@/config/subscription-types";
import { addInterval, formatMediumDate, getTodayKey } from "@/lib/dates";
import type { PaymentDraft, Subscription } from "@/types/client";

const inputClass = "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35";
const labelClass = "mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]";

interface RegisterPaymentDialogProps {
  subscription: Subscription;
  onCancel: () => void;
  onConfirm: (draft: PaymentDraft) => Promise<void>;
}

export function RegisterPaymentDialog({ subscription, onCancel, onConfirm }: RegisterPaymentDialogProps) {
  const [periods, setPeriods] = useState(1);
  const [amount, setAmount] = useState(subscription.amount);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, submitting]);

  const changePeriods = (value: number) => {
    const safePeriods = Number.isFinite(value) && value >= 1 ? Math.min(Math.round(value), 60) : 1;
    setPeriods(safePeriods);
    setAmount(subscription.amount * safePeriods);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!Number.isFinite(amount) || amount < 0) return setError("Indica un monto válido.");

    setSubmitting(true);
    try {
      await onConfirm({ subscriptionId: subscription.id, amount, periods, note });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo registrar el pago.");
      setSubmitting(false);
    }
  };

  const nextDueAfter = addInterval(subscription.nextDueDate, subscription.billingInterval, periods);
  const periodWord = subscription.billingInterval === "monthly" ? "mes" : "año";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#171917]/55 p-4 backdrop-blur-[3px]">
      <div role="dialog" aria-modal="true" aria-labelledby="register-payment-title" className="w-full max-w-lg rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--success-soft)] text-[var(--success-text)]"><CircleDollarSign aria-hidden="true" className="size-6" /></span>
          <button type="button" onClick={onCancel} disabled={submitting} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"><X aria-hidden="true" className="size-5" /></button>
        </div>
        <h2 id="register-payment-title" className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">Registrar pago</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{subscriptionTypeLabel(subscription.type)}{subscription.label ? ` · ${subscription.label}` : ""}</p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className={labelClass}>¿Cuántos {periodWord}s está pagando?</span>
            <input type="number" min="1" max="60" step="1" value={periods} onChange={(event) => changePeriods(Number(event.target.value))} className={inputClass} autoFocus />
          </label>

          <label className="block">
            <span className={labelClass}>Monto {periods > 1 ? "total" : ""}</span>
            <input type="number" min="0" step="0.01" value={amount === 0 ? "" : amount} onChange={(event) => setAmount(event.target.value === "" ? 0 : Number(event.target.value))} placeholder="0" className={inputClass} />
          </label>

          <label className="block">
            <span className={labelClass}>Nota (opcional)</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Transferencia, efectivo…" className={inputClass} />
          </label>

          <div className="space-y-2 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--muted-strong)]">
            <div className="flex items-center gap-2">
              <CalendarCheck2 aria-hidden="true" className="size-4 shrink-0 text-[var(--muted)]" />
              Se registrará con fecha de hoy: {formatMediumDate(getTodayKey())}
            </div>
            <div className="flex items-center gap-2">
              <CalendarCheck2 aria-hidden="true" className="size-4 shrink-0 text-[var(--muted)]" />
              Próximo pago pasará a: {formatMediumDate(nextDueAfter)}
            </div>
          </div>

          {error && <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={onCancel} disabled={submitting} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] hover:bg-[var(--surface-muted)]">Cancelar</button>
            <button type="submit" disabled={submitting} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--paper)] hover:bg-[var(--ink-hover)] disabled:opacity-60">
              {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Registrar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
