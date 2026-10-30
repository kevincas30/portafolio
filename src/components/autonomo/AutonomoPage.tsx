import { Users } from "lucide-react";
import { AutonomoView } from "@/components/autonomo/AutonomoView";
import { headerButtonClass } from "@/components/passwords/PasswordsHeader";
import { VaultGate } from "@/components/vault/VaultGate";
import { useVaultAutonomo } from "@/hooks/useVaultAutonomo";
import type { UserVaultAccess } from "@/hooks/useUserVault";

// Facturas e impuestos de autonomo: viven en la boveda del usuario, igual que sus finanzas.
export function AutonomoPage({ userVault }: { userVault: UserVaultAccess }) {
  return (
    <VaultGate userVault={userVault} section="Autónomo">
      {(switchUser) => <UserVaultAutonomo userVault={userVault} onSwitchUser={switchUser} />}
    </VaultGate>
  );
}

function UserVaultAutonomo({ userVault, onSwitchUser }: { userVault: UserVaultAccess; onSwitchUser: () => void }) {
  const session = userVault.active && userVault.dek ? { userId: userVault.active.id, dek: userVault.dek } : null;
  const autonomo = useVaultAutonomo(session, userVault.handleSessionError);

  if (!session || !userVault.active) return null;

  return (
    <AutonomoView
      autonomo={autonomo}
      owner={userVault.active.name}
      onLock={userVault.lock}
      headerActions={
        <button type="button" onClick={onSwitchUser} className={headerButtonClass}>
          <Users aria-hidden="true" className="size-4" /> Cambiar de usuario
        </button>
      }
    />
  );
}
