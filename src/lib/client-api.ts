import { withBase } from "@/lib/base-path";
import type { Client, ClientPayload, PaymentDraft, Subscription, SubscriptionPayload } from "@/types/client";

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: string };
    return new Error(body.error ?? "No se pudo completar la operación.");
  } catch {
    return new Error("No se pudo completar la operación.");
  }
}

export async function getClients(signal?: AbortSignal): Promise<Client[]> {
  const response = await fetch(withBase("/api/clients"), { cache: "no-store", signal });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { clients: Client[] }).clients;
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const response = await fetch(withBase("/api/clients"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { client: Client }).client;
}

export async function updateClient(payload: ClientPayload): Promise<Client> {
  const response = await fetch(withBase("/api/clients"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { client: Client }).client;
}

/** Pide al servidor que busque y guarde el logo de la web del cliente. */
export async function fetchClientLogo(id: string): Promise<string> {
  const response = await fetch(withBase("/api/client-logo"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { logo: string }).logo;
}

export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(withBase("/api/clients"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw await responseError(response);
}

export async function createSubscription(payload: SubscriptionPayload): Promise<Subscription> {
  const response = await fetch(withBase("/api/subscriptions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { subscription: Subscription }).subscription;
}

export async function updateSubscription(payload: SubscriptionPayload): Promise<Subscription> {
  const response = await fetch(withBase("/api/subscriptions"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { subscription: Subscription }).subscription;
}

export async function deleteSubscription(id: string): Promise<void> {
  const response = await fetch(withBase("/api/subscriptions"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw await responseError(response);
}

export async function registerPayment(draft: PaymentDraft): Promise<Subscription> {
  const response = await fetch(withBase("/api/payments"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { subscription: Subscription }).subscription;
}

export async function deletePayment(id: string): Promise<Subscription> {
  const response = await fetch(withBase("/api/payments"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { subscription: Subscription }).subscription;
}
