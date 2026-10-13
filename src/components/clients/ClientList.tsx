import { SearchX, Users } from "lucide-react";
import { ClientCard } from "@/components/clients/ClientCard";
import type { Client } from "@/types/client";

interface ClientListProps {
  clients: Client[];
  searching: boolean;
  loading: boolean;
  onCreate: () => void;
  onOpen: (clientId: string) => void;
}

export function ClientList({ clients, searching, loading, onCreate, onOpen }: ClientListProps) {
  if (loading && clients.length === 0) {
    return (
      <div className="space-y-2" aria-label="Cargando clientes">
        {[0, 1, 2].map((item) => <div key={item} className="h-[72px] animate-pulse rounded-[18px] border border-[var(--line-soft)] bg-[var(--surface)]/65" />)}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] px-5 py-12 text-center shadow-[0_10px_32px_rgba(23,25,23,0.04)]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
          {searching ? <SearchX aria-hidden="true" className="size-7" /> : <Users aria-hidden="true" className="size-7" />}
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
          {searching ? "No encontramos ese cliente" : "Todavía no hay clientes"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[var(--muted)]">
          {searching ? "Prueba buscando por cliente, negocio o servicio." : "Añade el primer cliente para empezar a llevar el control de sus pagos."}
        </p>
        {!searching && <button type="button" onClick={onCreate} className="mt-5 min-h-11 rounded-full bg-[var(--ink)] px-5 text-sm font-extrabold text-[var(--paper)] hover:bg-[var(--ink-hover)]">Nuevo cliente</button>}
      </div>
    );
  }

  return (
    <section aria-label="Todos los clientes" className="space-y-2">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} onOpen={onOpen} />
      ))}
    </section>
  );
}
