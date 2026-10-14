import { daysBetween, formatShortDateWithYear, getTodayKey } from "@/lib/dates";
import type { BillingInterval, Client, ClientStatus, Subscription } from "@/types/client";

export interface ClientStatusInfo {
  status: ClientStatus;
  label: string;
  days: number;
}

const UPCOMING_WINDOW_DAYS: Record<BillingInterval, number> = {
  monthly: 5,
  yearly: 30,
};

export function computeSubscriptionStatus(nextDueDate: string, active: boolean, billingInterval: BillingInterval): ClientStatusInfo {
  const days = daysBetween(getTodayKey(), nextDueDate);

  if (!active) {
    return { status: "paused", label: "Pausado", days };
  }
  if (days < 0) {
    return { status: "overdue", label: `Atrasado ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`, days };
  }
  if (days === 0) {
    return { status: "upcoming", label: "Vence hoy", days };
  }
  if (days <= UPCOMING_WINDOW_DAYS[billingInterval]) {
    return { status: "upcoming", label: `Vence en ${days} ${days === 1 ? "día" : "días"}`, days };
  }
  return { status: "ok", label: `Vence el ${formatShortDateWithYear(nextDueDate)}`, days };
}

const STATUS_RANK: Record<ClientStatus, number> = {
  overdue: 4,
  upcoming: 3,
  ok: 2,
  paused: 1,
  none: 0,
};

export function computeClientAggregateStatus(subscriptions: Subscription[]): ClientStatusInfo {
  if (subscriptions.length === 0) {
    return { status: "none", label: "Sin servicios", days: 0 };
  }

  return subscriptions
    .map((subscription) => computeSubscriptionStatus(subscription.nextDueDate, subscription.active, subscription.billingInterval))
    .reduce((worst, current) => STATUS_RANK[current.status] > STATUS_RANK[worst.status] ? current : worst);
}

export const statusStyles: Record<ClientStatus, { bg: string; text: string; dot: string; border: string }> = {
  overdue: { bg: "var(--danger-soft)", text: "var(--danger-text)", dot: "#ff5f57", border: "var(--danger-border)" },
  upcoming: { bg: "var(--warning-soft)", text: "var(--warning-text)", dot: "#febc2e", border: "var(--warning-border)" },
  ok: { bg: "var(--success-soft)", text: "var(--success-text)", dot: "#28c840", border: "var(--success-border)" },
  paused: { bg: "var(--surface-muted)", text: "var(--muted)", dot: "#9a9a8f", border: "var(--line)" },
  none: { bg: "var(--surface-muted)", text: "var(--muted)", dot: "#9a9a8f", border: "var(--line)" },
};

export function clientTotalPaid(client: Client): number {
  return client.subscriptions.reduce(
    (total, subscription) => total + subscription.payments.reduce((sum, payment) => sum + payment.amount, 0),
    0,
  );
}

export function totalPaidAcrossClients(clients: Client[]): number {
  return clients.reduce((total, client) => total + clientTotalPaid(client), 0);
}

const amountFormatter = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function formatAmount(value: number): string {
  return amountFormatter.format(value);
}

/** Splits the amount so the number and the € sign can be styled separately. */
export function formatAmountParts(value: number): { number: string; currency: string } {
  const parts = amountFormatter.formatToParts(value);
  const currency = parts.find((part) => part.type === "currency")?.value ?? "€";
  const number = parts
    .filter((part) => part.type !== "currency" && part.type !== "literal")
    .map((part) => part.value)
    .join("");
  return { number, currency };
}
