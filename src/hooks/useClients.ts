import { useCallback, useEffect, useState } from "react";
import {
  createClient as createClientRequest,
  createSubscription as createSubscriptionRequest,
  deleteClient as deleteClientRequest,
  deletePayment as deletePaymentRequest,
  deleteSubscription as deleteSubscriptionRequest,
  fetchClientLogo,
  getClients,
  registerPayment as registerPaymentRequest,
  updateClient as updateClientRequest,
  updateSubscription as updateSubscriptionRequest,
} from "@/lib/client-api";
import { normalizeUrl } from "@/lib/url";
import type { Client, ClientDraft, PaymentDraft, Subscription, SubscriptionDraft } from "@/types/client";

function replaceSubscription(clients: Client[], subscription: Subscription): Client[] {
  return clients.map((client) => {
    if (client.id !== subscription.clientId) return client;
    const exists = client.subscriptions.some((item) => item.id === subscription.id);
    const subscriptions = exists
      ? client.subscriptions.map((item) => item.id === subscription.id ? subscription : item)
      : [...client.subscriptions, subscription];
    return { ...client, subscriptions: subscriptions.sort((first, second) => first.nextDueDate.localeCompare(second.nextDueDate)) };
  });
}

export function useClients(enabled: boolean) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return;
    setLoading(true);
    try {
      setClients(await getClients(signal));
      setError("");
      setReady(true);
    } catch (reason) {
      if (signal?.aborted) return;
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar los clientes.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const initialRefreshId = window.setTimeout(() => void refresh(controller.signal), 0);
    const intervalId = window.setInterval(() => void refresh(controller.signal), 15_000);
    return () => {
      controller.abort();
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
    };
  }, [enabled, refresh]);

  const create = useCallback(async (draft: ClientDraft) => {
    const client = await createClientRequest({ id: window.crypto.randomUUID(), ...draft, websiteUrl: normalizeUrl(draft.websiteUrl) });
    setClients((current) => [...current, client]);
    return client;
  }, []);

  const update = useCallback(async (id: string, draft: ClientDraft) => {
    const client = await updateClientRequest({ id, ...draft, websiteUrl: normalizeUrl(draft.websiteUrl) });
    setClients((current) => current.map((item) => item.id === client.id ? { ...client, subscriptions: item.subscriptions } : item));
    return client;
  }, []);

  const refreshLogo = useCallback(async (id: string) => {
    const logo = await fetchClientLogo(id);
    setClients((current) => current.map((item) => item.id === id ? { ...item, logo } : item));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteClientRequest(id);
    setClients((current) => current.filter((item) => item.id !== id));
  }, []);

  const createSubscription = useCallback(async (draft: SubscriptionDraft) => {
    const subscription = await createSubscriptionRequest({ id: window.crypto.randomUUID(), ...draft });
    setClients((current) => replaceSubscription(current, subscription));
    return subscription;
  }, []);

  const updateSubscription = useCallback(async (id: string, draft: SubscriptionDraft) => {
    const subscription = await updateSubscriptionRequest({ id, ...draft });
    setClients((current) => replaceSubscription(current, subscription));
    return subscription;
  }, []);

  const removeSubscription = useCallback(async (id: string, clientId: string) => {
    await deleteSubscriptionRequest(id);
    setClients((current) => current.map((client) =>
      client.id === clientId
        ? { ...client, subscriptions: client.subscriptions.filter((item) => item.id !== id) }
        : client));
  }, []);

  const registerPayment = useCallback(async (draft: PaymentDraft) => {
    const subscription = await registerPaymentRequest(draft);
    setClients((current) => replaceSubscription(current, subscription));
    return subscription;
  }, []);

  const removePayment = useCallback(async (paymentId: string) => {
    const subscription = await deletePaymentRequest(paymentId);
    setClients((current) => replaceSubscription(current, subscription));
    return subscription;
  }, []);

  return {
    clients, loading, ready, error, refresh,
    create, update, remove, refreshLogo,
    createSubscription, updateSubscription, removeSubscription,
    registerPayment, removePayment,
  };
}
