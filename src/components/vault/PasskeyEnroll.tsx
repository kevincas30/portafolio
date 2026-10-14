import { useState, type FormEvent } from "react";
import { Fingerprint, LoaderCircle, TriangleAlert } from "lucide-react";
import { ErrorNote, inputClass, primaryButtonClass, VaultCard } from "@/components/vault/VaultCard";
import { RecoveryCodeScreen } from "@/components/vault/RecoveryCodeScreen";

interface PasskeyEnrollProps {
  initialName?: string;
  /** Crea el usuario pendiente y devuelve el codigo de recuperacion generado. */
  onBegin: (name: string) => Promise<{ recoveryCode: string }>;
  /** Pide la passkey y termina el alta; devuelve si la passkey puede descifrar (PRF). */
  onComplete: (confirmation: string) => Promise<{ prfCapable: boolean }>;
  onCancel: () => void;
  onDone: () => void;
}

type Step = { kind: "name" } | { kind: "code"; code: string } | { kind: "done"; prfCapable: boolean };

export function PasskeyEnroll({ initialName = "", onBegin, onComplete, onCancel, onDone }: PasskeyEnrollProps) {
  const [step, setStep] = useState<Step>({ kind: "name" });
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submitName = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Escribe tu nombre.");
    setSubmitting(true);
    try {
      const { recoveryCode } = await onBegin(name.trim());
      setStep({ kind: "code", code: recoveryCode });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear el usuario.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step.kind === "code") {
    return (
      <RecoveryCodeScreen
        code={step.code}
        onBack={onCancel}
        onConfirm={async (confirmation) => setStep({ kind: "done", ...(await onComplete(confirmation)) })}
      />
    );
  }

  if (step.kind === "done") {
    return (
      <VaultCard icon={step.prfCapable ? Fingerprint : TriangleAlert} eyebrow="Alta completada" title={step.prfCapable ? "Tu bóveda está lista" : "Bóveda creada, con un aviso"}>
        {step.prfCapable ? (
          <p className="text-sm font-medium leading-6 text-[var(--ink)]">Desde ahora puedes desbloquear tu bóveda con tu passkey. Conserva el código de recuperación por si pierdes el dispositivo.</p>
        ) : (
          <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--danger-text)]">
            Este autenticador no ofrece la extensión PRF, así que la passkey no puede descifrar tu bóveda. Por ahora solo podrás entrar con el código de recuperación. Prueba a añadir otra passkey desde un dispositivo compatible.
          </p>
        )}
        <button type="button" onClick={onDone} className={`${primaryButtonClass} mt-6`}>Entrar a mi bóveda</button>
      </VaultCard>
    );
  }

  return (
    <VaultCard icon={Fingerprint} eyebrow="Nuevo usuario" title="Crea tu bóveda">
      <form onSubmit={submitName}>
        <p className="mb-5 text-sm font-medium leading-6 text-[var(--ink)]">
          Tus contraseñas se cifran en este dispositivo con una clave que solo tú puedes abrir con tu passkey. Primero te daremos un código de recuperación.
        </p>
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Tu nombre</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} autoComplete="off" autoFocus className={inputClass} />
        </label>
        <ErrorNote message={error} />
        <button type="submit" disabled={submitting} className={`${primaryButtonClass} mt-6`}>
          {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Continuar
        </button>
        <button type="button" onClick={onCancel} disabled={submitting} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl text-sm font-bold text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">Volver</button>
      </form>
    </VaultCard>
  );
}
