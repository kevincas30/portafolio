import { useEffect, useState, type FormEvent } from "react";
import { Check, Fingerprint, KeyRound, LoaderCircle, X } from "lucide-react";
import { ErrorNote, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/vault/VaultCard";
import type { UnlockMethod } from "@/hooks/useUserVault";

interface AddPasskeyProps {
  onAdd: (method: UnlockMethod) => Promise<void>;
  onClose: () => void;
}

// Step-up (PA-8): para añadir una passkey hay que volver a demostrar acceso con passkey o con el codigo.
export function AddPasskey({ onAdd, onClose }: AddPasskeyProps) {
  const [useCode, setUseCode] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const run = async (method: UnlockMethod) => {
    setError("");
    setBusy(true);
    try {
      await onAdd(method);
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo añadir la passkey.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    void run({ kind: "recovery", code });
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#171917]/55 p-4 backdrop-blur-[3px]">
      <div role="dialog" aria-modal="true" aria-labelledby="add-passkey-title" className="w-full max-w-lg rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--ink)]"><Fingerprint aria-hidden="true" className="size-6" /></span>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"><X aria-hidden="true" className="size-5" /></button>
        </div>
        <h2 id="add-passkey-title" className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">Añadir otra passkey</h2>

        {done ? (
          <>
            <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-6 text-[var(--ink)]"><Check aria-hidden="true" className="mt-1 size-4 shrink-0" /> Passkey añadida. Ya puedes desbloquear tu bóveda con ella.</p>
            <button type="button" onClick={onClose} className={`${primaryButtonClass} mt-6`}>Listo</button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">Por seguridad, confirma primero que eres tú. Después se te pedirá crear la passkey nueva.</p>
            {!useCode ? (
              <div className="mt-5">
                <button type="button" disabled={busy} onClick={() => void run({ kind: "passkey" })} className={primaryButtonClass}>
                  {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Fingerprint aria-hidden="true" className="size-4" />}
                  Confirmar con mi passkey
                </button>
                <button type="button" disabled={busy} onClick={() => { setError(""); setUseCode(true); }} className={`${secondaryButtonClass} mt-3`}>
                  <KeyRound aria-hidden="true" className="size-4" /> Usar código de recuperación
                </button>
              </div>
            ) : (
              <form onSubmit={submitCode} className="mt-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Código de recuperación</span>
                  <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus className={`${inputClass} font-mono tracking-[0.08em]`} />
                </label>
                <button type="submit" disabled={busy || !code.trim()} className={`${primaryButtonClass} mt-4`}>
                  {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                  Confirmar y crear passkey
                </button>
                <button type="button" disabled={busy} onClick={() => { setError(""); setUseCode(false); }} className={`${secondaryButtonClass} mt-3`}>Volver</button>
              </form>
            )}
            <ErrorNote message={error} />
          </>
        )}
      </div>
    </div>
  );
}
