import { useState } from "react";
import { Check, LoaderCircle, Receipt, Trash2, X } from "lucide-react";
import { formatMediumDate } from "@/lib/dates";
import { formatAmount } from "@/lib/client-status";
import type { Payment } from "@/types/client";

interface PaymentHistoryProps {
  payments: Payment[];
  onDelete: (paymentId: string) => Promise<void>;
}

export function PaymentHistory({ payments, onDelete }: PaymentHistoryProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-8 text-center">
        <Receipt aria-hidden="true" className="mx-auto size-6 text-[var(--line-strong)]" />
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">Todavía no hay pagos registrados.</p>
      </div>
    );
  }

  const remove = async (paymentId: string) => {
    setDeletingId(paymentId);
    try {
      await onDelete(paymentId);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <ul className="space-y-2">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3.5 py-3 sm:px-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-[var(--ink)]">
              {formatAmount(payment.amount)}
              {payment.periods > 1 && (
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--accent-text)]">
                  {payment.periods} periodos
                </span>
              )}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--muted)]">
              {formatMediumDate(payment.paidAt)}{payment.note ? ` · ${payment.note}` : ""}
            </p>
          </div>

          {confirmingId === payment.id ? (
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => remove(payment.id)} disabled={deletingId === payment.id} aria-label="Confirmar eliminar pago" className="grid size-8 place-items-center rounded-full bg-[var(--danger)] text-white disabled:opacity-60">
                {deletingId === payment.id ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Check aria-hidden="true" className="size-3.5" />}
              </button>
              <button type="button" onClick={() => setConfirmingId(null)} disabled={deletingId === payment.id} aria-label="Cancelar" className="grid size-8 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]">
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingId(payment.id)} aria-label="Eliminar pago" title="Eliminar pago" className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]">
              <Trash2 aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
