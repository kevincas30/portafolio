import { ChevronRight, Globe2 } from "lucide-react";
import { OwnerAvatars } from "@/components/clients/OwnerAvatars";
import { StatusBadge } from "@/components/clients/StatusBadge";
import { subscriptionTypeLabel } from "@/config/subscription-types";
import { computeClientAggregateStatus } from "@/lib/client-status";
import type { Client } from "@/types/client";

interface ClientCardProps {
  client: Client;
  onOpen: (clientId: string) => void;
}

export function ClientCard({ client, onOpen }: ClientCardProps) {
  const statusInfo = computeClientAggregateStatus(client.subscriptions);
  const servicesLabel = client.subscriptions.length > 0
    ? client.subscriptions.map((subscription) => subscriptionTypeLabel(subscription.type)).join(" · ")
    : "Sin servicios";

  return (
    <button
      type="button"
      onClick={() => onOpen(client.id)}
      aria-label={`Ver detalles de ${client.clientName}`}
      className="group flex w-full items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-left shadow-[0_4px_16px_rgba(23,25,23,0.04)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] hover:shadow-[0_7px_20px_rgba(23,25,23,0.06)] active:scale-[0.995] sm:px-4"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
        <Globe2 aria-hidden="true" className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-extrabold tracking-[-0.02em] text-[var(--ink)] sm:text-[15px]">
            {client.businessName || client.clientName}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--muted)]">
          {client.clientName} · {servicesLabel}
        </span>
      </span>

      <OwnerAvatars owners={client.owners} />
      <StatusBadge status={statusInfo.status} label={statusInfo.label} />

      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-[var(--line-strong)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--muted-strong)]"
      />
    </button>
  );
}
