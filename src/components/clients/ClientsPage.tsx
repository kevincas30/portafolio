import { useCallback, useMemo, useRef, useState } from "react";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientList } from "@/components/clients/ClientList";
import { ClientSearch } from "@/components/clients/ClientSearch";
import { ClientsHeader } from "@/components/clients/ClientsHeader";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { DeleteSubscriptionDialog } from "@/components/clients/DeleteSubscriptionDialog";
import { RegisterPaymentDialog } from "@/components/clients/RegisterPaymentDialog";
import { SubscriptionForm } from "@/components/clients/SubscriptionForm";
import { Toast } from "@/components/passwords/Toast";
import { computeClientAggregateStatus, totalPaidAcrossClients } from "@/lib/client-status";
import { useClients } from "@/hooks/useClients";
import { ownerDescription } from "@/lib/client-owner";
import type { Client, ClientDraft, PaymentDraft, Subscription, SubscriptionDraft } from "@/types/client";

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function ClientsPage({ active }: { active: boolean }) {
  const clientsState = useClients(active);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [subscriptionFormClient, setSubscriptionFormClient] = useState<Client | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null);
  const [payingSubscription, setPayingSubscription] = useState<Subscription | null>(null);

  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToast(""), 2_000);
  }, []);

  const selectedClient = selectedClientId
    ? clientsState.clients.find((client) => client.id === selectedClientId) ?? null
    : null;

  const visibleClients = useMemo(() => {
    const query = normalizeSearch(search);
    const matches = query
      ? clientsState.clients.filter((client) =>
          normalizeSearch([client.clientName, client.businessName, client.notes, ownerDescription(client.owners)].join(" ")).includes(query))
      : clientsState.clients;

    return [...matches].sort((first, second) => {
      const firstStatus = computeClientAggregateStatus(first.subscriptions);
      const secondStatus = computeClientAggregateStatus(second.subscriptions);
      return firstStatus.days - secondStatus.days;
    });
  }, [clientsState.clients, search]);

  const counts = useMemo(() => {
    let overdueCount = 0;
    let upcomingCount = 0;
    clientsState.clients.forEach((client) => {
      const status = computeClientAggregateStatus(client.subscriptions).status;
      if (status === "overdue") overdueCount += 1;
      if (status === "upcoming") upcomingCount += 1;
    });
    return { overdueCount, upcomingCount };
  }, [clientsState.clients]);

  const totalPaid = useMemo(() => totalPaidAcrossClients(clientsState.clients), [clientsState.clients]);

  const openCreate = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const openClient = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const saveClient = async (draft: ClientDraft) => {
    if (editingClient) {
      await clientsState.update(editingClient.id, draft);
      showToast("Cliente actualizado");
    } else {
      await clientsState.create(draft);
      showToast("Cliente creado");
    }
    setFormOpen(false);
    setEditingClient(null);
  };

  const confirmDeleteClient = async () => {
    if (!deletingClient) return;
    const deletingId = deletingClient.id;
    await clientsState.remove(deletingClient.id);
    setDeletingClient(null);
    if (selectedClientId === deletingId) setSelectedClientId(null);
    showToast("Cliente eliminado");
  };

  const saveSubscription = async (draft: SubscriptionDraft) => {
    if (editingSubscription) {
      await clientsState.updateSubscription(editingSubscription.id, draft);
      showToast("Servicio actualizado");
    } else {
      await clientsState.createSubscription(draft);
      showToast("Servicio creado");
    }
    setSubscriptionFormClient(null);
    setEditingSubscription(null);
  };

  const confirmDeleteSubscription = async () => {
    if (!deletingSubscription) return;
    await clientsState.removeSubscription(deletingSubscription.id, deletingSubscription.clientId);
    setDeletingSubscription(null);
    showToast("Servicio eliminado");
  };

  const confirmPayment = async (draft: PaymentDraft) => {
    await clientsState.registerPayment(draft);
    setPayingSubscription(null);
    showToast("Pago registrado");
  };

  const deletePayment = async (paymentId: string) => {
    await clientsState.removePayment(paymentId);
    showToast("Pago eliminado");
  };

  const openAddSubscription = (client: Client) => {
    setEditingSubscription(null);
    setSubscriptionFormClient(client);
  };

  const openEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setSubscriptionFormClient(selectedClient ?? null);
  };

  if (selectedClient) {
    return (
      <>
        <ClientDetail
          client={selectedClient}
          onBack={() => setSelectedClientId(null)}
          onEdit={openEdit}
          onDelete={setDeletingClient}
          onAddSubscription={openAddSubscription}
          onEditSubscription={openEditSubscription}
          onDeleteSubscription={setDeletingSubscription}
          onRegisterPayment={setPayingSubscription}
          onDeletePayment={deletePayment}
        />

        {formOpen && (
          <ClientForm
            key={editingClient?.id ?? "new-client"}
            client={editingClient ?? undefined}
            onSave={saveClient}
            onCancel={() => {
              setFormOpen(false);
              setEditingClient(null);
            }}
          />
        )}
        {deletingClient && (
          <DeleteClientDialog client={deletingClient} onCancel={() => setDeletingClient(null)} onConfirm={confirmDeleteClient} />
        )}
        {subscriptionFormClient && (
          <SubscriptionForm
            key={editingSubscription?.id ?? "new-subscription"}
            clientId={subscriptionFormClient.id}
            subscription={editingSubscription ?? undefined}
            onSave={saveSubscription}
            onCancel={() => {
              setSubscriptionFormClient(null);
              setEditingSubscription(null);
            }}
          />
        )}
        {deletingSubscription && (
          <DeleteSubscriptionDialog subscription={deletingSubscription} onCancel={() => setDeletingSubscription(null)} onConfirm={confirmDeleteSubscription} />
        )}
        {payingSubscription && (
          <RegisterPaymentDialog subscription={payingSubscription} onCancel={() => setPayingSubscription(null)} onConfirm={confirmPayment} />
        )}
        <Toast message={toast} />
      </>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <ClientsHeader overdueCount={counts.overdueCount} upcomingCount={counts.upcomingCount} totalPaid={totalPaid} onCreate={openCreate} />
      <ClientSearch value={search} onChange={setSearch} resultCount={visibleClients.length} />

      {clientsState.error && (
        <div className="rounded-2xl border border-[var(--danger-border-soft)] bg-[var(--danger-soft-strong)] px-4 py-3 text-sm font-bold text-[var(--danger-text)]">{clientsState.error}</div>
      )}

      <ClientList
        clients={visibleClients}
        searching={Boolean(search.trim())}
        loading={clientsState.loading}
        onCreate={openCreate}
        onOpen={openClient}
      />

      {formOpen && (
        <ClientForm
          key={editingClient?.id ?? "new-client"}
          client={editingClient ?? undefined}
          onSave={saveClient}
          onCancel={() => {
            setFormOpen(false);
            setEditingClient(null);
          }}
        />
      )}
      {deletingClient && (
        <DeleteClientDialog client={deletingClient} onCancel={() => setDeletingClient(null)} onConfirm={confirmDeleteClient} />
      )}

      <Toast message={toast} />
    </div>
  );
}
