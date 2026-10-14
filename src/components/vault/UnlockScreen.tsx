import { useState, type FormEvent } from "react";
import { Fingerprint, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import { ErrorNote, inputClass, primaryButtonClass, secondaryButtonClass, VaultCard } from "@/components/vault/VaultCard";

interface UnlockScreenProps {
  userName: string;
  onPasskey: () => Promise<void>;
  onRecovery: (code: string) => Promise<void>;
  onBack: () => void;
}

export function UnlockScreen({ userName, onPasskey, onRecovery, onBack }: UnlockScreenProps) {
  const [useCode, setUseCode] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<void>, fallback: string) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : fallback);
      setBusy(false);
    }
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    void run(() => onRecovery(code), "No se pudo desbloquear con el código.");
  };

  return (
    <VaultCard icon={LockKeyhole} eyebrow="Bóveda bloqueada" title={`Hola, ${userName}`}>
      {!useCode ? (
        <>
          <p className="mb-5 text-sm font-medium leading-6 text-[var(--ink)]">Usa tu passkey para desbloquear tus contraseñas. La clave de descifrado nunca sale de este dispositivo.</p>
          <button type="button" disabled={busy} onClick={() => void run(onPasskey, "No se pudo desbloquear con la passkey.")} className={primaryButtonClass}>
            {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Fingerprint aria-hidden="true" className="size-4" />}
            Desbloquear con passkey
          </button>
          <button type="button" disabled={busy} onClick={() => { setError(""); setUseCode(true); }} className={`${secondaryButtonClass} mt-3`}>
            <KeyRound aria-hidden="true" className="size-4" /> Usar código de recuperación
          </button>
        </>
      ) : (
        <form onSubmit={submitCode}>
          <label className="block">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Código de recuperación</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus className={`${inputClass} font-mono tracking-[0.08em]`} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" />
          </label>
          <button type="submit" disabled={busy || !code.trim()} className={`${primaryButtonClass} mt-6`}>
            {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Desbloquear con el código
          </button>
          <button type="button" disabled={busy} onClick={() => { setError(""); setUseCode(false); }} className={`${secondaryButtonClass} mt-3`}>
            <Fingerprint aria-hidden="true" className="size-4" /> Volver a la passkey
          </button>
        </form>
      )}
      <ErrorNote message={error} />
      <button type="button" onClick={onBack} disabled={busy} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl text-sm font-bold text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">Cambiar de usuario</button>
    </VaultCard>
  );
}
