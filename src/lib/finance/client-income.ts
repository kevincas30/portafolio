// Ingresos que vienen de Clientes: un fijo enlazado a un servicio anota cada pago registrado
// con su monto y su fecha reales. Los datos de Clientes no se tocan: solo se leen.
import { subscriptionTypeLabel } from "@/config/subscription-types";
import type { PendingEntry } from "@/lib/finance/recurring";
import type { Client, Subscription } from "@/types/client";
import type { RecurringRule } from "@/types/finance";

export interface ServiceOption {
  subscription: Subscription;
  client: Client;
  /** "Tinas Ibiza · Mantenimiento + Hosting" */
  label: string;
}

function clientName(client: Client): string {
  return client.businessName.trim() || client.clientName.trim();
}

export function serviceLabel(client: Client, subscription: Subscription): string {
  return `${clientName(client)} · ${subscription.label.trim() || subscriptionTypeLabel(subscription.type)}`;
}

/** Por ahora sin compartidos: solo clientes cuyo unico responsable es esta persona. */
function isMine(client: Client, memberId: string): boolean {
  return client.owners.length === 1 && client.owners[0] === memberId;
}

/** Servicios que la persona puede enlazar como ingreso fijo. */
export function myServices(clients: Client[], memberId: string | null): ServiceOption[] {
  if (!memberId) return [];
  return clients
    .filter((client) => isMine(client, memberId))
    .flatMap((client) => client.subscriptions.map((subscription) => ({ subscription, client, label: serviceLabel(client, subscription) })))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export interface ClientIncomeRun {
  entries: PendingEntry[];
  /** Reglas con importedPaymentIds al dia. Solo cambian si se importo algo. */
  rules: RecurringRule[];
}

/**
 * Pagos registrados en Clientes que todavia no se anotaron. Incluye los anteriores al enlace
 * (el historico entra al enlazar). Si el cliente deja de ser de esta persona, se deja de importar.
 */
export function importClientPayments(rules: RecurringRule[], clients: Client[], memberId: string | null, newId: () => string): ClientIncomeRun {
  const services = new Map(myServices(clients, memberId).map((option) => [option.subscription.id, option]));
  const entries: PendingEntry[] = [];
  const updated = rules.map((rule) => {
    const service = rule.subscriptionId ? services.get(rule.subscriptionId) : undefined;
    if (!rule.active || !service) return rule;
    const imported = new Set(rule.importedPaymentIds ?? []);
    const fresh = service.subscription.payments
      .filter((payment) => !imported.has(payment.id) && payment.amount > 0)
      .sort((a, b) => a.paidAt.localeCompare(b.paidAt));
    if (fresh.length === 0) return rule;
    for (const payment of fresh) {
      entries.push({
        id: newId(),
        kind: "income",
        amount: Math.round(payment.amount * 100),
        date: payment.paidAt.slice(0, 10),
        categoryId: rule.categoryId,
        note: payment.periods > 1 ? `${service.label} (${payment.periods} periodos)` : service.label,
        recurringId: rule.id,
      });
    }
    return { ...rule, importedPaymentIds: [...imported, ...fresh.map((payment) => payment.id)] };
  });
  return { entries, rules: updated };
}
