import { useState } from "react";
import { Fingerprint, Users } from "lucide-react";
import { PasswordsView } from "@/components/passwords/PasswordsView";
import { headerButtonClass } from "@/components/passwords/PasswordsHeader";
import { AddPasskey } from "@/components/vault/AddPasskey";
import { useVaultCredentials } from "@/hooks/useVaultCredentials";
import { useVaultGroups } from "@/hooks/useVaultGroups";
import type { UserVaultAccess } from "@/hooks/useUserVault";

interface UserVaultPasswordsProps {
  userVault: UserVaultAccess;
  /** Bloquea y vuelve a la pantalla de seleccion de usuario. */
  onSwitchUser: () => void;
}

// Ruta nueva: boveda cifrada por usuario. Solo se monta con la DEK desbloqueada.
export function UserVaultPasswords({ userVault, onSwitchUser }: UserVaultPasswordsProps) {
  const session = userVault.active && userVault.dek ? { userId: userVault.active.id, dek: userVault.dek } : null;
  const credentialsState = useVaultCredentials(session, userVault.handleSessionError);
  const groupsState = useVaultGroups(session, credentialsState, userVault.handleSessionError);
  const [addingPasskey, setAddingPasskey] = useState(false);

  if (!session || !userVault.active) return null;

  return (
    <>
      <PasswordsView
        credentialsState={credentialsState}
        groupsState={groupsState}
        onLock={userVault.lock}
        owner={userVault.active.name}
        footerText="Bóveda cifrada · Bloqueo tras 15 minutos de inactividad."
        headerActions={
          <>
            <button type="button" onClick={onSwitchUser} className={headerButtonClass}>
              <Users aria-hidden="true" className="size-4" />
              Cambiar de usuario
            </button>
            <button type="button" onClick={() => setAddingPasskey(true)} className={headerButtonClass}>
              <Fingerprint aria-hidden="true" className="size-4" />
              Añadir passkey
            </button>
          </>
        }
      />
      {addingPasskey && (
        <AddPasskey onAdd={(method) => userVault.addPasskey(method)} onClose={() => setAddingPasskey(false)} />
      )}
    </>
  );
}
