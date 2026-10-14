import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { PasswordsView } from "@/components/passwords/PasswordsView";
import { useCredentials } from "@/hooks/useCredentials";
import { useCredentialGroups } from "@/hooks/useCredentialGroups";
import type { VaultAccess } from "@/hooks/useVault";

// Ruta legacy: credenciales sin usuario, cifradas con la clave derivada de la contraseña maestra.
export function LegacyPasswords({ vault, headerActions }: { vault: VaultAccess; headerActions?: ReactNode }) {
  const credentialsState = useCredentials(vault.key);
  const groupsState = useCredentialGroups(vault.status === "unlocked");
  const migrationStarted = useRef(false);
  const [migrationError, setMigrationError] = useState("");

  const lockVault = () => {
    migrationStarted.current = false;
    setMigrationError("");
    vault.lock();
  };

  useEffect(() => {
    if (
      vault.status !== "unlocked" ||
      !vault.key ||
      !credentialsState.ready ||
      !credentialsState.requiresEncryptionMigration ||
      migrationStarted.current
    ) return;

    migrationStarted.current = true;
    void credentialsState.migrateToEncrypted()
      .catch((reason: unknown) => {
        setMigrationError(reason instanceof Error ? reason.message : "No se pudieron cifrar las contraseñas existentes.");
      });
  }, [credentialsState, vault]);

  if (vault.status !== "unlocked" || !vault.key) {
    return null;
  }

  if (credentialsState.ready && credentialsState.requiresEncryptionMigration) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-[26px] border border-[var(--line-soft)] bg-[var(--surface)] px-5 text-center">
        {migrationError ? (
          <div className="max-w-md">
            <p className="text-lg font-extrabold text-[var(--ink)]">No se pudieron cifrar las contraseñas</p>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">{migrationError}</p>
            <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Recarga la página para intentarlo de nuevo. No se eliminó ninguna contraseña.</p>
          </div>
        ) : (
          <div>
            <LoaderCircle aria-hidden="true" className="mx-auto size-7 animate-spin text-[var(--ink)]" />
            <p className="mt-3 text-sm font-extrabold text-[var(--ink)]">Cifrando tus contraseñas…</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">Esto solo ocurrirá una vez y no cerrará el panel.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <PasswordsView
      credentialsState={credentialsState}
      groupsState={groupsState}
      vaultKey={vault.key}
      onLock={lockVault}
      headerActions={headerActions}
      footerText="Panel cifrado · Bloqueo tras 30 minutos de inactividad."
    />
  );
}
