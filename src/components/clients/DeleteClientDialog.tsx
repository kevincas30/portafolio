import { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import type { Client } from "@/types/client";

interface DeleteClientDialogProps {
  client: Client;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteClientDialog({ client, onCancel, onConfirm }: DeleteClientDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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
      await onConfirm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo eliminar el cliente.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#171917]/55 p-4 backdrop-blur-[3px]">
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-client-title" className="w-full max-w-lg rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]"><AlertTriangle aria-hidden="true" className="size-6" /></span>
          <button type="button" onClick={onCancel} disabled={deleting} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"><X aria-hidden="true" className="size-5" /></button>
        </div>
        <h2 id="delete-client-title" className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">Eliminar {client.clientName}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">Esta acción eliminará al cliente y todo su historial de pagos. No se puede deshacer.</p>

        {error && <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={deleting} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] hover:bg-[var(--surface-muted)]">Cancelar</button>
          <button type="button" onClick={confirm} disabled={deleting} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--danger)] px-4 text-sm font-extrabold text-white hover:bg-[var(--danger-hover)] disabled:opacity-60">
            {deleting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Eliminar cliente
          </button>
        </div>
      </div>
    </div>
  );
}
