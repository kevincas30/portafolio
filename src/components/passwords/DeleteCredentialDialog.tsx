import { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import type { Credential } from "@/types/credential";

interface DeleteCredentialDialogProps {
  credential: Credential;
  dependencies: Credential[];
  onCancel: () => void;
  onConfirm: (force: boolean) => Promise<void>;
}

export function DeleteCredentialDialog({ credential, dependencies, onCancel, onConfirm }: DeleteCredentialDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const hasDependencies = dependencies.length > 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting, onCancel]);

  const confirm = async () => {
    setDeleting(true);
    setError("");
    try {
      await onConfirm(hasDependencies);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo eliminar la cuenta.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#171917]/55 p-4 backdrop-blur-[3px]">
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-credential-title" className="w-full max-w-lg rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]"><AlertTriangle aria-hidden="true" className="size-6" /></span>
          <button type="button" onClick={onCancel} disabled={deleting} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"><X aria-hidden="true" className="size-5" /></button>
        </div>
        <h2 id="delete-credential-title" className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">Eliminar {credential.name}</h2>

        {hasDependencies ? (
          <div className="mt-3">
            <p className="text-sm font-semibold leading-6 text-[var(--ink)]">Esta cuenta se utiliza para iniciar sesión en {dependencies.length} {dependencies.length === 1 ? "plataforma" : "plataformas"}:</p>
            <ul className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-2xl bg-[var(--surface-muted)] p-3">
              {dependencies.map((dependency) => <li key={dependency.id} className="rounded-xl bg-[var(--surface)] px-3 py-2 text-sm font-extrabold text-[var(--ink)]">{dependency.name}</li>)}
            </ul>
            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">Estas cuentas no se eliminarán, pero quedarán sin credencial relacionada.</p>
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">Esta acción eliminará la cuenta y no se puede deshacer.</p>
        )}

        {error && <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={deleting} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] hover:bg-[var(--surface-muted)]">Cancelar</button>
          <button type="button" onClick={confirm} disabled={deleting} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--danger)] px-4 text-sm font-extrabold text-white hover:bg-[var(--danger-hover)] disabled:opacity-60">
            {deleting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {hasDependencies ? "Eliminar y desvincular" : "Eliminar cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
