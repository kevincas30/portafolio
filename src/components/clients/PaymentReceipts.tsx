import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText } from "lucide-react";
import { subscriptionTypeLabel } from "@/config/subscription-types";
import { site } from "@/config/site";
import { withBase } from "@/lib/base-path";
import { formatAmount } from "@/lib/client-status";
import { addDays, formatMediumDate, formatShortDateWithYear } from "@/lib/dates";
import { paymentCoverage, type PaymentCoverage } from "@/lib/payment-calendar";
import type { BillingInterval, Client, Payment, Subscription } from "@/types/client";

interface ReceiptData {
  number: string;
  client: Client;
  subscription: Subscription;
  payment: Payment;
  coverage: PaymentCoverage | undefined;
}

const RECEIPT_FONTS = [
  '700 16px "Space Grotesk Variable"',
  '400 13px "Manrope Variable"',
  '600 10px "IBM Plex Mono"',
  '400 10px "IBM Plex Mono"',
];

/** No es una numeracion fiscal: solo identifica el recibo (fecha + inicio del id del pago). */
function receiptNumber(payment: Payment): string {
  return `R-${payment.paidAt.replaceAll("-", "")}-${payment.id.slice(0, 4).toUpperCase()}`;
}

function periodsLabel(periods: number, interval: BillingInterval): string {
  if (interval === "monthly") return `${periods} ${periods === 1 ? "mes" : "meses"}`;
  return `${periods} ${periods === 1 ? "año" : "años"}`;
}

function serviceName(subscription: Subscription): string {
  return `${subscriptionTypeLabel(subscription.type)}${subscription.label ? ` · ${subscription.label}` : ""}`;
}

function ReceiptDocument({ data, onReady }: { data: ReceiptData; onReady: () => void }) {
  const { client, subscription, payment, coverage } = data;
  const period = coverage
    ? `${formatShortDateWithYear(coverage.from)} – ${formatShortDateWithYear(addDays(coverage.until, -1))}`
    : "—";
  const eyebrow = "font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted";

  return (
    <div className="receipt-print font-body text-[13px] leading-6 text-ink">
      <header className="flex items-center justify-between gap-6">
        <img src={withBase("/logo-light.png")} alt={site.name} onLoad={onReady} onError={onReady} className="h-9 w-auto" />
        <span className="rounded-full bg-lime px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">
          Recibo de pago
        </span>
      </header>

      <section className="mt-8 rounded-[22px] bg-ink px-7 py-6 text-paper">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/60">Total pagado</p>
        <p className="mt-1 font-display text-[44px] font-bold leading-none tracking-[-0.04em] text-lime">{formatAmount(payment.amount)}</p>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-[12px] text-paper/80">
          <span>Nº <span className="font-mono">{data.number}</span></span>
          <span>Pagado el {formatMediumDate(payment.paidAt)}</span>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-6">
        <div className="rounded-[18px] bg-paper px-5 py-4">
          <p className={eyebrow}>Cliente</p>
          <p className="mt-1.5 font-display text-[17px] font-bold tracking-[-0.02em]">{client.businessName || client.clientName}</p>
          {client.businessName && <p className="text-muted">{client.clientName}</p>}
        </div>
        <div className="rounded-[18px] bg-paper px-5 py-4">
          <p className={eyebrow}>Emitido por</p>
          <p className="mt-1.5 font-display text-[17px] font-bold tracking-[-0.02em]">{site.name}</p>
          <p className="text-muted">www.discreativo.com · {site.email}</p>
          <p className="text-muted">{site.whatsappDisplay}</p>
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink/15">
            <th className={`pb-2.5 ${eyebrow}`}>Concepto</th>
            <th className={`pb-2.5 ${eyebrow}`}>Período cubierto</th>
            <th className={`pb-2.5 text-right ${eyebrow}`}>Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-ink/15 align-top">
            <td className="py-4 pr-4">
              <span className="block font-display text-[15px] font-bold tracking-[-0.02em]">{serviceName(subscription)}</span>
              <span className="text-muted">{periodsLabel(payment.periods, subscription.billingInterval)}</span>
            </td>
            <td className="py-4 pr-4">{period}</td>
            <td className="py-4 text-right font-display text-[15px] font-bold">{formatAmount(payment.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className={`pt-4 text-right ${eyebrow}`}>Total</td>
            <td className="pt-3 text-right font-display text-[22px] font-bold tracking-[-0.03em]">{formatAmount(payment.amount)}</td>
          </tr>
        </tfoot>
      </table>

      {payment.note && (
        <p className="mt-6 rounded-[14px] border border-ink/15 px-4 py-3 text-muted">
          <span className={eyebrow}>Nota</span> <span className="ml-2">{payment.note}</span>
        </p>
      )}

      <footer className="mt-14 flex items-end justify-between gap-6 border-t border-ink/15 pt-4 text-[11px] text-muted">
        <p>Este documento es un justificante de pago y no tiene validez como factura.</p>
        <p className="shrink-0 font-display text-[13px] font-bold text-ink">Gracias por confiar en nosotros<span className="text-[var(--lime-text)]">✳</span></p>
      </footer>
    </div>
  );
}

export function PaymentReceipts({ client }: { client: Client }) {
  const [printing, setPrinting] = useState<ReceiptData | null>(null);

  const rows = client.subscriptions
    .flatMap((subscription) => {
      const coverage = paymentCoverage(subscription);
      return subscription.payments.map((payment) => ({
        number: receiptNumber(payment),
        client,
        subscription,
        payment,
        coverage: coverage.get(payment.id),
      }));
    })
    .sort((a, b) => b.payment.paidAt.localeCompare(a.payment.paidAt) || b.payment.createdAt.localeCompare(a.payment.createdAt));

  const [ready, setReady] = useState(false);

  const open = (row: ReceiptData) => {
    setReady(false);
    setPrinting(row);
  };

  // Se monta el recibo y, cuando cargaron el logo y las fuentes, se abre la impresion ("Guardar como PDF").
  useEffect(() => {
    if (!printing || !ready) return;
    let cancelled = false;
    const previousTitle = document.title;
    document.title = `Recibo ${printing.number}`;
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done);
    // El recibo esta oculto en pantalla, asi que sus fuentes no se piden solas: se cargan antes de imprimir.
    void Promise.allSettled(RECEIPT_FONTS.map((font) => document.fonts.load(font))).then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", done);
      document.title = previousTitle;
    };
  }, [printing, ready]);

  return (
    <section aria-labelledby="receipts-title" className="mt-6">
      <h2 id="receipts-title" className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Recibos</h2>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm font-semibold text-[var(--muted)]">
          Cuando registres un pago vas a poder generar su recibo.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.payment.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3.5 py-3 sm:px-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[var(--ink)]">{serviceName(row.subscription)}</p>
                <p className="truncate text-xs font-semibold text-[var(--muted)]">
                  {formatMediumDate(row.payment.paidAt)} · {formatAmount(row.payment.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => open(row)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
              >
                <FileText aria-hidden="true" className="size-3.5" />
                Recibo PDF
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] font-semibold text-[var(--muted)]">Justificante de pago, no es una factura.</p>
      {printing && createPortal(<ReceiptDocument data={printing} onReady={() => setReady(true)} />, document.body)}
    </section>
  );
}
