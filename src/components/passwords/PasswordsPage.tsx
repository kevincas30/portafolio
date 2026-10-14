import { useState } from "react";
import { Users } from "lucide-react";
import { LegacyPasswords } from "@/components/passwords/LegacyPasswords";
import { headerButtonClass } from "@/components/passwords/PasswordsHeader";
import { UserVaultPasswords } from "@/components/passwords/UserVaultPasswords";
import { PasskeyEnroll } from "@/components/vault/PasskeyEnroll";
import { UnlockScreen } from "@/components/vault/UnlockScreen";
import { UserPicker } from "@/components/vault/UserPicker";
import { useUserVault, type ActiveVaultUser } from "@/hooks/useUserVault";
import type { VaultAccess } from "@/hooks/useVault";

type View =
  | { kind: "picker" }
  | { kind: "enroll"; initialName?: string }
  | { kind: "unlock"; user: ActiveVaultUser }
  // Cuentas anteriores (sin usuario) hasta que se migren en la fase 3.
  | { kind: "legacy" };

// `vault` es la puerta del panel (contraseña maestra). Debajo conviven la ruta legacy y la boveda por usuario.
export function PasswordsPage({ vault }: { vault: VaultAccess }) {
  const userVault = useUserVault();
  const [view, setView] = useState<View>({ kind: "picker" });

  const switchUser = () => {
    userVault.lock();
    setView({ kind: "picker" });
  };

  if (view.kind === "enroll") {
    // El alta ya deja la boveda desbloqueada: se queda aqui hasta que el usuario cierre la pantalla final.
    return (
      <PasskeyEnroll
        initialName={view.initialName}
        onBegin={async (name) => {
          const { recoveryCode } = await userVault.beginEnrollment(name);
          return { recoveryCode };
        }}
        onComplete={(confirmation) => userVault.completeEnrollment(confirmation)}
        onCancel={() => {
          userVault.cancelEnrollment();
          void userVault.refreshUsers();
          setView({ kind: "picker" });
        }}
        onDone={() => setView(userVault.active ? { kind: "unlock", user: userVault.active } : { kind: "picker" })}
      />
    );
  }

  if (userVault.status === "unlocked") {
    return <UserVaultPasswords userVault={userVault} onSwitchUser={switchUser} />;
  }

  if (view.kind === "legacy") {
    return (
      <LegacyPasswords
        vault={vault}
        headerActions={
          <button type="button" onClick={() => setView({ kind: "picker" })} className={headerButtonClass}>
            <Users aria-hidden="true" className="size-4" />
            Cambiar de usuario
          </button>
        }
      />
    );
  }

  if (view.kind === "unlock") {
    return (
      <UnlockScreen
        userName={view.user.name}
        onPasskey={() => userVault.unlockWithPasskey(view.user)}
        onRecovery={(code) => userVault.unlockWithRecovery(view.user, code)}
        onBack={() => setView({ kind: "picker" })}
      />
    );
  }

  return (
    <UserPicker
      users={userVault.users}
      state={userVault.usersState}
      error={userVault.usersError}
      onRetry={() => void userVault.refreshUsers()}
      onCreate={() => setView({ kind: "enroll" })}
      onSelect={(user) =>
        setView(user.status === "pending" ? { kind: "enroll", initialName: user.name } : { kind: "unlock", user: { id: user.id, name: user.name } })}
      onUseLegacy={() => setView({ kind: "legacy" })}
    />
  );
}
