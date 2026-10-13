import type { BillingInterval, SubscriptionType } from "@/types/client";

export interface SubscriptionTypeDefinition {
  id: SubscriptionType;
  label: string;
  billingInterval: BillingInterval;
}

export const subscriptionTypes: SubscriptionTypeDefinition[] = [
  { id: "maintenance", label: "Mantenimiento", billingInterval: "monthly" },
  { id: "domain", label: "Dominio", billingInterval: "yearly" },
];

export function billingIntervalFor(type: SubscriptionType): BillingInterval {
  return subscriptionTypes.find((definition) => definition.id === type)?.billingInterval ?? "monthly";
}

export function subscriptionTypeLabel(type: SubscriptionType): string {
  return subscriptionTypes.find((definition) => definition.id === type)?.label ?? type;
}

export const billingIntervalLabels: Record<BillingInterval, string> = {
  monthly: "Mensual",
  yearly: "Anual",
};
