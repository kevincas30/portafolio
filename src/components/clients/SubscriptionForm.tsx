import { useState, type FormEvent } from "react";
import { LoaderCircle, Pause, Play, X } from "lucide-react";
import { billingIntervalLabels, billingIntervalFor, subscriptionTypes } from "@/config/subscription-types";
import { getTodayKey } from "@/lib/dates";
import type { Subscription, SubscriptionDraft, SubscriptionType } from "@/types/client";

const inputClass = "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35";
const labelClass = "mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]";

function draftFromSubscription(clientId: string, subscription?: Subscription): SubscriptionDraft {
  return {
    clientId,
    type: subscription?.type ?? "maintenance",
    label: subscription?.label ?? "",
    billingInterval: subscription?.billingInterval ?? billingIntervalFor("maintenance"),
    amount: subscription?.amount ?? 0,
    nextDueDate: subscription?.nextDueDate ?? getTodayKey(),
    active: subscription?.active ?? true,
  };
}

interface SubscriptionFormProps {
  clientId: string;
  subscription?: Subscription;
  onSave: (draft: SubscriptionDraft) => Promise<void>;
  onCancel: () => void;
}

export function SubscriptionForm({ clientId, subscription, onSave, onCancel }: SubscriptionFormProps) {
  const [draft, setDraft] = useState<SubscriptionDraft>(() => draftFromSubscription(clientId, subscription));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const setField = <Key extends keyof SubscriptionDraft>(key: Key, value: SubscriptionDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const changeType = (type: SubscriptionType) => {
    setDraft((current) => ({ ...current, type, billingInterval: billingIntervalFor(type) }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!draft.nextDueDate) return setError("Indica la fecha del próximo pago.");

    setSubmitting(true);
    try {
      await onSave(draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el servicio.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#171917]/55 p-4 backdrop-blur-[3px]">
      <div role="dialog" aria-modal="true" aria-labelledby="subscription-form-title" className="w-full max-w-lg rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 id="subscription-form-title" className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">{subscription ? "Editar servicio" : "Nuevo servicio"}</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]">
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <span className={labelClass}>Tipo de servicio</span>
            <div className="grid grid-cols-2 gap-2">
              {subscriptionTypes.map((definition) => {
                const active = draft.type === definition.id;
                return (
                  <button
                    key={definition.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => changeType(definition.id)}
                    className={`flex min-h-12 cursor-pointer flex-col items-start justify-center rounded-2xl border px-3.5 text-left transition ${
                      active
                        ? "border-[var(--line-strong)] bg-[var(--surface-muted)]"
                        : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <span className="text-sm font-extrabold text-[var(--ink)]">{definition.label}</span>
                    <span className="text-[11px] font-semibold text-[var(--muted)]">Se cobra {billingIntervalLabels[definition.billingInterval].toLowerCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className={labelClass}>Nombre o nota <span className="normal-case tracking-normal text-[var(--muted)]">(opcional)</span></span>
            <input value={draft.label} onChange={(event) => setField("label", event.target.value)} placeholder="Ej. dominio .com" className={inputClass} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Monto</span>
              <input type="number" min="0" step="0.01" value={draft.amount === 0 ? "" : draft.amount} onChange={(event) => setField("amount", event.target.value === "" ? 0 : Number(event.target.value))} placeholder="0" className={inputClass} autoFocus />
            </label>
            <label className="block">
              <span className={labelClass}>{subscription ? "Próximo pago" : "Primer pago"}</span>
              <input type="date" value={draft.nextDueDate} onChange={(event) => setField("nextDueDate", event.target.value)} className={inputClass} />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setField("active", !draft.active)}
            className={`inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition ${
              draft.active
                ? "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)]"
                : "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--muted)]"
            }`}
          >
            {draft.active ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
            {draft.active ? "Servicio activo" : "Servicio pausado"}
          </button>

          {error && <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={onCancel} disabled={submitting} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] hover:bg-[var(--surface-muted)]">Cancelar</button>
            <button type="submit" disabled={submitting} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--paper)] hover:bg-[var(--ink-hover)] disabled:opacity-60">
              {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {subscription ? "Guardar cambios" : "Crear servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
