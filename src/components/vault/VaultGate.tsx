import { useState, type ReactNode } from "react";
import { PasskeyEnroll } from "@/components/vault/PasskeyEnroll";
import { UnlockScreen } from "@/components/vault/UnlockScreen";
import { UserPicker } from "@/components/vault/UserPicker";
import type { ActiveVaultUser, UserVaultAccess } from "@/hooks/useUserVault";

type View =
  | { kind: "picker" }
  | { kind: "enroll"; initialName?: string }
  | { kind: "unlock"; user: ActiveVaultUser };

interface VaultGateProps {
  userVault: UserVaultAccess;
  /** Nombre de la seccion que pide la boveda, para el encabezado del selector. */
  section: string;
  /** Contenido con la boveda desbloqueada. `switchUser` bloquea y vuelve al selector. */
  children: (switchUser: () => void) => ReactNode;
}

// Elegir usuario, darlo de alta o desbloquearlo. La boveda (DEK) es una sola para todo el panel:
// desbloquearla desde una seccion deja abiertas las demas.
export function VaultGate({ userVault, section, children }: VaultGateProps) {
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

  if (userVault.status === "unlocked") return <>{children(switchUser)}</>;

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
      eyebrow={section}
      users={userVault.users}
      state={userVault.usersState}
      error={userVault.usersError}
      onRetry={() => void userVault.refreshUsers()}
      onCreate={() => setView({ kind: "enroll" })}
      onSelect={(user) =>
        setView(user.status === "pending" ? { kind: "enroll", initialName: user.name } : { kind: "unlock", user: { id: user.id, name: user.name } })}
    />
  );
}
