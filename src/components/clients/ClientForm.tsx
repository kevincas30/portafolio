import { useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Client, ClientDraft } from "@/types/client";

const inputClass = "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35";
const labelClass = "mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]";

function draftFromClient(client?: Client): ClientDraft {
  return {
    clientName: client?.clientName ?? "",
    businessName: client?.businessName ?? "",
    websiteUrl: client?.websiteUrl ?? "",
    notes: client?.notes ?? "",
  };
}

interface ClientFormProps {
  client?: Client;
  onSave: (draft: ClientDraft) => Promise<void>;
  onCancel: () => void;
}

export function ClientForm({ client, onSave, onCancel }: ClientFormProps) {
  const [draft, setDraft] = useState<ClientDraft>(() => draftFromClient(client));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const setField = <Key extends keyof ClientDraft>(key: Key, value: ClientDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!draft.clientName.trim()) return setError("El nombre del cliente es obligatorio.");

    setSubmitting(true);
    try {
      await onSave(draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171917]/55 p-3 backdrop-blur-[3px] sm:p-6" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="client-form-title" className="mx-auto my-3 w-full max-w-2xl rounded-[26px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:my-8">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[26px] border-b border-[var(--line)] bg-[var(--surface)]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">Clientes y suscripciones</p>
            <h2 id="client-form-title" className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">{client ? `Editar ${client.clientName}` : "Nuevo cliente"}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]">
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Nombre del cliente *</span>
              <input value={draft.clientName} onChange={(event) => setField("clientName", event.target.value)} placeholder="Juan Pérez" className={inputClass} autoFocus />
            </label>
            <label className="block">
              <span className={labelClass}>Nombre del negocio</span>
              <input value={draft.businessName} onChange={(event) => setField("businessName", event.target.value)} placeholder="Pizzería Don Juan" className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Link de la web <span className="normal-case tracking-normal text-[var(--muted)]">(opcional)</span></span>
              <input value={draft.websiteUrl} onChange={(event) => setField("websiteUrl", event.target.value)} placeholder="misitio.com" className={inputClass} />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Notas</span>
            <textarea value={draft.notes} onChange={(event) => setField("notes", event.target.value)} rows={3} placeholder="Información útil sobre este cliente…" className={`${inputClass} resize-y py-3`} />
          </label>

          {!client && (
            <p className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--accent-text-strong)]">
              Después de crear al cliente podrás añadirle sus servicios (Mantenimiento, Dominio…) con su monto y fecha de pago.
            </p>
          )}

          {error && <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5">
            <button type="button" onClick={onCancel} disabled={submitting} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">Cancelar</button>
            <button type="submit" disabled={submitting} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--paper)] shadow-[0_8px_20px_rgba(23,25,23,0.2)] transition hover:bg-[var(--ink-hover)] disabled:opacity-60">
              {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {client ? "Guardar cambios" : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
