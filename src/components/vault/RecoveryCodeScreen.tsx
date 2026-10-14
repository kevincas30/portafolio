import { useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, ShieldAlert } from "lucide-react";
import { ErrorNote, inputClass, primaryButtonClass, secondaryButtonClass, VaultCard } from "@/components/vault/VaultCard";

interface RecoveryCodeScreenProps {
  code: string;
  /** Debe lanzar si la confirmacion no coincide o el alta falla. */
  onConfirm: (confirmation: string) => Promise<void>;
  onBack: () => void;
}

// El codigo se muestra una sola vez y el alta no avanza hasta reescribirlo (S-VC-9).
export function RecoveryCodeScreen({ code, onConfirm, onBack }: RecoveryCodeScreenProps) {
  const [confirmation, setConfirmation] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setError("No se pudo copiar. Anótalo a mano.");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onConfirm(confirmation);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar el alta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VaultCard icon={ShieldAlert} eyebrow="Último paso antes de crear tu passkey" title="Tu código de recuperación">
      <div className="mb-5 flex gap-3 rounded-2xl bg-[var(--surface-muted)] p-4 text-[var(--ink)]">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm font-medium leading-6">
          Es la única forma de recuperar tu bóveda si pierdes la passkey. Se muestra <strong>una sola vez</strong>: guárdalo en un lugar seguro y fuera de este dispositivo. Nadie podrá recuperarlo por ti.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-5 text-center">
        <p className="select-all break-all font-mono text-lg font-bold tracking-[0.08em] text-[var(--ink)] sm:text-xl">{code}</p>
      </div>
      <button type="button" onClick={copy} className={`${secondaryButtonClass} mt-3`}>
        {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
        {copied ? "Copiado" : "Copiar código"}
      </button>

      <form onSubmit={submit} className="mt-6">
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Escríbelo de nuevo para confirmar</span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={`${inputClass} font-mono tracking-[0.08em]`}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          />
        </label>
        <ErrorNote message={error} />
        <button type="submit" disabled={submitting || !confirmation.trim()} className={`${primaryButtonClass} mt-6`}>
          {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Confirmar y crear mi passkey
        </button>
        <button type="button" onClick={onBack} disabled={submitting} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl text-sm font-bold text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">Cancelar</button>
      </form>
    </VaultCard>
  );
}
