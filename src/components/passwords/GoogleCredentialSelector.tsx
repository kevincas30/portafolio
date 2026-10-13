import { CheckCircle2, Plus } from "lucide-react";
import type { Credential } from "@/types/credential";

interface GoogleCredentialSelectorProps {
  credentials: Credential[];
  value: string | null;
  onChange: (id: string | null) => void;
  optional?: boolean;
  onAdd: () => void;
}

export function GoogleCredentialSelector({ credentials, value, onChange, optional, onAdd }: GoogleCredentialSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">
        {optional ? "Cuenta de correo relacionada (opcional)" : "¿Con qué cuenta Google? *"}
      </p>

      {credentials.length > 0 ? (
        <div className="space-y-2">
          {optional && (
            <button type="button" onClick={() => onChange(null)} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border border-[var(--line)] px-3 text-left text-sm font-bold text-[var(--ink)] transition ${value === null ? "bg-[var(--accent-soft)]" : "bg-[var(--surface)]"}`}>
              <span className={`size-5 rounded-full border-2 border-[var(--line-strong)] ${value === null ? "bg-[var(--ink)] shadow-[inset_0_0_0_4px_var(--surface)]" : ""}`} />
              Ninguna
            </button>
          )}
          {credentials.map((credential) => {
            const active = value === credential.id;
            return (
              <button key={credential.id} type="button" onClick={() => onChange(credential.id)} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border border-[var(--line)] px-3 text-left transition ${active ? "bg-[var(--accent-soft)]" : "bg-[var(--surface)] hover:border-[var(--line-strong)]"}`}>
                {active ? <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-[var(--ink)]" /> : <span className="size-5 shrink-0 rounded-full border-2 border-[var(--line-strong)]" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-[var(--ink)]">{credential.email || credential.username || credential.name}</span>
                  <span className="block truncate text-[11px] font-semibold text-[var(--ink)]">{credential.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
          <p className="text-sm font-bold text-[var(--accent-text-strong)]">Esta cuenta Google todavía no está guardada.</p>
        </div>
      )}

      <div className="mt-4 border-t border-[var(--line)] pt-3">
        <p className="text-xs font-bold text-[var(--ink)]">¿No está guardada?</p>
        <button type="button" onClick={onAdd} className="mt-1 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--accent-soft)]">
          <Plus aria-hidden="true" className="size-4" />
          Crear nueva cuenta Google
        </button>
      </div>
    </div>
  );
}
