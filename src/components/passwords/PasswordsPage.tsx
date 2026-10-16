import { UserVaultPasswords } from "@/components/passwords/UserVaultPasswords";
import { VaultGate } from "@/components/vault/VaultGate";
import type { UserVaultAccess } from "@/hooks/useUserVault";

// El panel ya esta abierto (contraseña maestra, en Dashboard). Aqui solo vive la boveda por usuario.
export function PasswordsPage({ userVault }: { userVault: UserVaultAccess }) {
  return (
    <VaultGate userVault={userVault} section="Contraseñas">
      {(switchUser) => <UserVaultPasswords userVault={userVault} onSwitchUser={switchUser} />}
    </VaultGate>
  );
}
