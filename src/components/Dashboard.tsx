import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ClientsPage } from "@/components/clients/ClientsPage";
import { PasswordsPage } from "@/components/passwords/PasswordsPage";
import { SectionSwitcher, type AppSection } from "@/components/SectionSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PanelLogin } from "@/components/passwords/PanelLogin";
import { usePanelSession, type PanelSession } from "@/hooks/usePanelSession";
import { useUserVault } from "@/hooks/useUserVault";

const sectionTitles: Record<AppSection, string> = {
  clients: "Clientes · Panel",
  passwords: "Contraseñas · Panel",
};

export function Dashboard() {
  const panel = usePanelSession();

  useEffect(() => {
    if (panel.status !== "unlocked") document.title = "Acceso privado · Panel";
  }, [panel.status]);

  if (panel.status !== "unlocked") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[720px] items-center px-4 py-6 sm:px-6">
        <div className="w-full"><PanelLogin status={panel.status} error={panel.error} onSetup={panel.setup} onUnlock={panel.unlock} /></div>
      </main>
    );
  }

  return <UnlockedDashboard onLock={panel.lock} />;
}

function UnlockedDashboard({ onLock }: { onLock: PanelSession["lock"] }) {
  const [activeSection, setActiveSection] = useState<AppSection>("clients");
  // Una sola boveda para todo el panel: la usan Contraseñas y Gastos.
  const userVault = useUserVault();

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
            <button type="button" onClick={onLock} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm text-[var(--ink)] transition hover:bg-[var(--accent-soft)]"><LockKeyhole className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Bloquear panel</span></button>
          </div>
        </div>

        <SectionSwitcher activeSection={activeSection} onChange={setActiveSection} />

        <div className={activeSection === "clients" ? "block" : "hidden"}>
          <ClientsPage active={activeSection === "clients"} />
        </div>
        <div className={activeSection === "passwords" ? "block" : "hidden"}>
          <PasswordsPage userVault={userVault} />
        </div>
      </div>
    </main>
  );
}
