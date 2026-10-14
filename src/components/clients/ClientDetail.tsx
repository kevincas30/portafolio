import { ArrowLeft, ExternalLink, Globe2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { PaymentCalendar } from "@/components/clients/PaymentCalendar";
import { PaymentReceipts } from "@/components/clients/PaymentReceipts";
import { SubscriptionCard } from "@/components/clients/SubscriptionCard";
import { clientTotalPaid, formatAmount } from "@/lib/client-status";
import { safeHref } from "@/lib/url";
import type { Client, Subscription } from "@/types/client";

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onAddSubscription: (client: Client) => void;
  onEditSubscription: (subscription: Subscription) => void;
  onDeleteSubscription: (subscription: Subscription) => void;
  onRegisterPayment: (subscription: Subscription) => void;
  onDeletePayment: (paymentId: string) => Promise<void>;
}

export function ClientDetail({
  client,
  onBack,
  onEdit,
  onDelete,
  onAddSubscription,
  onEditSubscription,
  onDeleteSubscription,
  onRegisterPayment,
  onDeletePayment,
}: ClientDetailProps) {
  const totalPaid = clientTotalPaid(client);

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-3 sm:space-y-4 xl:relative xl:left-1/2 xl:w-[calc(100vw-4rem)] xl:max-w-[1600px] xl:-translate-x-1/2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-extrabold text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Regresar
      </button>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
      <article className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_12px_38px_rgba(23,25,23,0.06)]">
        <header className="border-b border-[var(--line-soft)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-[1_1_240px] items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <Globe2 aria-hidden="true" className="size-5" />
              </span>
              <h1 className="min-w-0 break-words text-lg font-extrabold tracking-[-0.03em] text-[var(--ink)] sm:text-xl">
                {client.businessName || client.clientName}
                <span className="font-semibold text-[var(--muted)]"> · {client.clientName}</span>
              </h1>
            </div>

            <div className="ml-auto flex max-w-full items-center gap-1.5">
              <button type="button" onClick={() => onEdit(client)} aria-label={`Editar ${client.clientName}`} title="Editar" className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
                <Pencil aria-hidden="true" className="size-4" />
              </button>
              <button type="button" onClick={() => onDelete(client)} aria-label={`Eliminar ${client.clientName}`} title="Eliminar" className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]">
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface)]/60 text-[var(--accent-text)]">
              <Wallet aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--accent-text-strong)]">Total pagado</p>
              <p className="text-lg font-extrabold text-[var(--accent-text-strong)]">{formatAmount(totalPaid)}</p>
            </div>
          </div>

          {(client.websiteUrl || client.notes) && (
            <section aria-labelledby="client-info-title">
              <h2 id="client-info-title" className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Información</h2>
              <div className="mt-3 space-y-2">
                {safeHref(client.websiteUrl) && (
                  <a
                    href={safeHref(client.websiteUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3.5 py-3 transition hover:border-[var(--line-strong)] sm:px-4"
                  >
                    <span>
                      <span className="block text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">Sitio web</span>
                      <span className="mt-1 block truncate text-sm font-bold text-[var(--ink)]">{client.websiteUrl.replace(/^https?:\/\//, "")}</span>
                    </span>
                    <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-[var(--muted)]" />
                  </a>
                )}
                {client.notes && (
                  <p className="whitespace-pre-wrap rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--muted-strong)]">{client.notes}</p>
                )}
              </div>
            </section>
          )}

          <section aria-labelledby="subscriptions-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="subscriptions-title" className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Servicios</h2>
              <button
                type="button"
                onClick={() => onAddSubscription(client)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Agregar servicio
              </button>
            </div>

            {client.subscriptions.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm font-semibold text-[var(--muted)]">
                Este cliente todavía no tiene servicios. Agrega su primer Mantenimiento o Dominio.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {client.subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onEdit={onEditSubscription}
                    onDelete={onDeleteSubscription}
                    onRegisterPayment={onRegisterPayment}
                    onDeletePayment={onDeletePayment}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </article>

      {client.subscriptions.length > 0 && (
        <aside aria-labelledby="calendar-title" className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)] px-4 py-5 shadow-[0_12px_38px_rgba(23,25,23,0.06)] sm:px-6 sm:py-6 xl:sticky xl:top-6">
          <h2 id="calendar-title" className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Calendario de pagos</h2>
          <div className="mt-3 space-y-3">
            {client.subscriptions.map((subscription) => (
              <PaymentCalendar key={subscription.id} subscription={subscription} />
            ))}
          </div>
          <PaymentReceipts client={client} />
        </aside>
      )}
      </div>
    </div>
  );
}
