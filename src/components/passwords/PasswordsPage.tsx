import { LegacyPasswords } from "@/components/passwords/LegacyPasswords";
import type { VaultAccess } from "@/hooks/useVault";

export function PasswordsPage({ vault }: { vault: VaultAccess }) {
  return <LegacyPasswords vault={vault} />;
}
