import { LoaderCircle, Plus, UserRound, Users } from "lucide-react";
import { ErrorNote, secondaryButtonClass, VaultCard } from "@/components/vault/VaultCard";
import type { VaultUserSummary } from "@/lib/user-vault-api";

interface UserPickerProps {
  /** Seccion desde la que se pide la boveda (Contraseñas, Gastos...). */
  eyebrow: string;
  users: VaultUserSummary[];
  state: "loading" | "ready" | "error";
  error: string;
  onSelect: (user: VaultUserSummary) => void;
  onCreate: () => void;
  onRetry: () => void;
}

export function UserPicker({ eyebrow, users, state, error, onSelect, onCreate, onRetry }: UserPickerProps) {
  return (
    <VaultCard icon={Users} eyebrow={eyebrow} title="¿Quién eres?">
      {state === "loading" && (
        <div className="grid place-items-center py-6 text-[var(--ink)]">
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
          <p className="mt-3 text-sm font-bold">Cargando usuarios…</p>
        </div>
      )}

      {state === "error" && (
        <>
          <ErrorNote message={error} />
          <button type="button" onClick={onRetry} className={`${secondaryButtonClass} mt-4`}>Reintentar</button>
        </>
      )}

      {state === "ready" && (
        <>
          <p className="mb-5 text-sm font-medium leading-6 text-[var(--ink)]">
            Cada persona tiene su propia bóveda cifrada. Elige la tuya para desbloquearla con tu passkey.
          </p>
          <ul className="space-y-3">
            {users.map((user) => (
              <li key={user.id}>
                <button type="button" onClick={() => onSelect(user)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-left transition hover:bg-[var(--surface-muted)]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--ink)]"><UserRound aria-hidden="true" className="size-5" /></span>
                  <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-[var(--ink)]">{user.name}</span>
                  {user.status === "pending" && <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--muted-strong)]">Alta sin terminar</span>}
                </button>
              </li>
            ))}
          </ul>
          {users.length === 0 && <p className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">Todavía no hay usuarios. Crea el primero.</p>}

          <button type="button" onClick={onCreate} className={`${secondaryButtonClass} mt-4`}>
            <Plus aria-hidden="true" className="size-4" /> Nuevo usuario
          </button>
        </>
      )}
    </VaultCard>
  );
}
