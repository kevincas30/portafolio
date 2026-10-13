import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ClientsPage } from "@/components/clients/ClientsPage";
import { PasswordsPage } from "@/components/passwords/PasswordsPage";
import { SectionSwitcher, type AppSection } from "@/components/SectionSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VaultUnlock } from "@/components/passwords/VaultUnlock";
import { useVault } from "@/hooks/useVault";

const sectionTitles: Record<AppSection, string> = {
  clients: "Clientes · Panel",
  passwords: "Contraseñas · Panel",
};

export function Dashboard() {
  const vault = useVault();

  useEffect(() => {
    if (vault.status !== "unlocked") document.title = "Acceso privado · Panel";
  }, [vault.status]);

  if (vault.status !== "unlocked" || !vault.key) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[720px] items-center px-4 py-6 sm:px-6">
        <div className="w-full"><VaultUnlock status={vault.status} error={vault.error} onSetup={vault.setup} onUnlock={vault.unlock} /></div>
      </main>
    );
  }

  return <UnlockedDashboard vault={vault} />;
}

function UnlockedDashboard({ vault }: { vault: ReturnType<typeof useVault> }) {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");

  useEffect(() => {
    document.title = sectionTitles[activeSection];
  }, [activeSection]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] px-4 py-4 sm:px-6 sm:py-7 lg:px-8 lg:py-10">
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs text-[var(--muted)] sm:flex"><LockKeyhole className="size-3.5" aria-hidden="true" /> Acceso privado</span>
            <ThemeToggle />
            <button type="button" onClick={vault.lock} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm text-[var(--ink)] transition hover:bg-[var(--accent-soft)]"><LockKeyhole className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Bloquear panel</span></button>
          </div>
        </div>

        <SectionSwitcher activeSection={activeSection} onChange={setActiveSection} />

        <div className={activeSection === "clients" ? "block" : "hidden"}>
          <ClientsPage active={activeSection === "clients"} />
        </div>
        <div className={activeSection === "passwords" ? "block" : "hidden"}>
          <PasswordsPage vault={vault} />
        </div>
      </div>
    </main>
  );
}
