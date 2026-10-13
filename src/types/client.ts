export type BillingInterval = "monthly" | "yearly";
export type SubscriptionType = "maintenance" | "domain";

export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  paidAt: string;
  periods: number;
  note: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  type: SubscriptionType;
  label: string;
  billingInterval: BillingInterval;
  amount: number;
  nextDueDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  payments: Payment[];
}

export interface Client {
  id: string;
  clientName: string;
  businessName: string;
  websiteUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  subscriptions: Subscription[];
}

export interface ClientDraft {
  clientName: string;
  businessName: string;
  websiteUrl: string;
  notes: string;
}

export interface ClientPayload extends ClientDraft {
  id: string;
}

export interface SubscriptionDraft {
  clientId: string;
  type: SubscriptionType;
  label: string;
  billingInterval: BillingInterval;
  amount: number;
  nextDueDate: string;
  active: boolean;
}

export interface SubscriptionPayload extends SubscriptionDraft {
  id: string;
}

export interface PaymentDraft {
  subscriptionId: string;
  amount: number;
  periods: number;
  note: string;
}

export type ClientStatus = "overdue" | "upcoming" | "ok" | "paused" | "none";
