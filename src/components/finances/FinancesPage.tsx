import { Users } from "lucide-react";
import { FinancesView } from "@/components/finances/FinancesView";
import { headerButtonClass } from "@/components/passwords/PasswordsHeader";
import { VaultGate } from "@/components/vault/VaultGate";
import { useVaultFinances } from "@/hooks/useVaultFinances";
import type { UserVaultAccess } from "@/hooks/useUserVault";

// Gastos e ingresos personales: viven en la boveda del usuario, igual que sus contrasenas.
export function FinancesPage({ userVault }: { userVault: UserVaultAccess }) {
  return (
    <VaultGate userVault={userVault} section="Gastos">
      {(switchUser) => <UserVaultFinances userVault={userVault} onSwitchUser={switchUser} />}
    </VaultGate>
  );
}

function UserVaultFinances({ userVault, onSwitchUser }: { userVault: UserVaultAccess; onSwitchUser: () => void }) {
  const session = userVault.active && userVault.dek ? { userId: userVault.active.id, dek: userVault.dek } : null;
  const finances = useVaultFinances(session, userVault.handleSessionError);

  if (!session || !userVault.active) return null;

  return (
    <FinancesView
      finances={finances}
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
