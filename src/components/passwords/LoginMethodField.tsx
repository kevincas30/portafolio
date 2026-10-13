import { KeyRound, ShieldCheck } from "lucide-react";
import type { LoginMethod } from "@/types/credential";

const methods: Array<{ id: LoginMethod; label: string; icon: typeof KeyRound }> = [
  { id: "password", label: "Contraseña", icon: KeyRound },
  { id: "google", label: "Continuar con Google", icon: ShieldCheck },
];

function GoogleLogo() {
  return (
    <span className="grid size-7 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" aria-label="Logo de Google" className="size-[18px]">
        <path fill="#FFC107" d="M43.61 20H42V20H24v8h11.3C33.65 32.66 29.22 36 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-4Z" />
        <path fill="#FF3D00" d="m6.31 14.69 6.57 4.82C14.65 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4c-7.68 0-14.34 4.34-17.69 10.69Z" />
        <path fill="#4CAF50" d="M24 44c5.17 0 9.86-1.98 13.41-5.19l-6.19-5.24A11.9 11.9 0 0 1 24 36c-5.2 0-9.62-3.32-11.28-7.95L6.2 33.08C9.5 39.56 16.23 44 24 44Z" />
        <path fill="#1976D2" d="M43.61 20H42V20H24v8h11.3a12.04 12.04 0 0 1-4.09 5.57l6.2 5.24C37 39.18 44 34 44 24c0-1.34-.14-2.65-.39-4Z" />
      </svg>
    </span>
  );
}

export function LoginMethodField({ value, onChange }: { value: LoginMethod; onChange: (value: LoginMethod) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Método de acceso *</legend>
      <div className="grid grid-cols-2 gap-2">
        {methods.map(({ id, label, icon: Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id)}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-3 text-left text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--muted)]/25 ${
                active
                  ? "border-[var(--line-strong)] bg-[var(--surface-muted)] text-[var(--ink)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--line-strong)]"
              }`}
            >
              {id === "google" ? <GoogleLogo /> : <Icon aria-hidden="true" className="size-4 shrink-0" />}
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
