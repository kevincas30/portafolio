import { useState } from "react";
import { ChevronDown, CircleDollarSign, Globe2, Pencil, Trash2, Wrench } from "lucide-react";
import { PaymentHistory } from "@/components/clients/PaymentHistory";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { billingIntervalLabels, subscriptionTypeLabel } from "@/config/subscription-types";
import { computeSubscriptionStatus, formatAmount } from "@/lib/client-status";
import { formatMediumDate } from "@/lib/dates";
import type { Subscription } from "@/types/client";

const typeIcons = {
  maintenance: Wrench,
  domain: Globe2,
};

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (subscription: Subscription) => void;
  onRegisterPayment: (subscription: Subscription) => void;
  onDeletePayment: (paymentId: string) => Promise<void>;
}

export function SubscriptionCard({ subscription, onEdit, onDelete, onRegisterPayment, onDeletePayment }: SubscriptionCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const statusInfo = computeSubscriptionStatus(subscription.nextDueDate, subscription.active, subscription.billingInterval);
  const Icon = typeIcons[subscription.type];

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[var(--ink)]">
              {subscriptionTypeLabel(subscription.type)}{subscription.label ? ` · ${subscription.label}` : ""}
            </p>
            <p className="text-xs font-semibold text-[var(--muted)]">
              {formatAmount(subscription.amount)} / {billingIntervalLabels[subscription.billingInterval].toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <StatusBadge status={statusInfo.status} label={statusInfo.label} />
          <button type="button" onClick={() => onEdit(subscription)} aria-label="Editar servicio" title="Editar" className="grid size-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(subscription)} aria-label="Eliminar servicio" title="Eliminar" className="grid size-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]">
            <Trash2 aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onRegisterPayment(subscription)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--ink)] px-4 text-xs font-extrabold text-[var(--paper)] transition hover:bg-[var(--ink-hover)] active:scale-[0.99]"
        >
          <CircleDollarSign aria-hidden="true" className="size-3.5" />
          Registrar pago
        </button>

        <button
          type="button"
          onClick={() => setHistoryOpen((current) => !current)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
        >
          <ChevronDown aria-hidden="true" className={`size-3.5 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          {subscription.payments.length > 0
            ? `Historial (${subscription.payments.length})`
            : "Sin pagos registrados"}
        </button>

        {subscription.payments[0] && (
          <span className="text-xs font-semibold text-[var(--muted)]">Último pago: {formatMediumDate(subscription.payments[0].paidAt)}</span>
        )}
      </div>

      {historyOpen && (
        <div className="mt-3">
          <PaymentHistory payments={subscription.payments} onDelete={onDeletePayment} />
        </div>
      )}
    </div>
  );
}
