import { ChevronRight } from "lucide-react";
import { PlatformLogo } from "@/components/passwords/PlatformLogo";
import type { Credential } from "@/types/credential";

interface CredentialCardProps {
  credential: Credential;
  onOpen: (credentialId: string) => void;
}

export function CredentialCard({ credential, onOpen }: CredentialCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(credential.id)}
      aria-label={`Ver detalles de ${credential.name}`}
      className="group flex min-h-[68px] w-full items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-left shadow-[0_4px_16px_rgba(23,25,23,0.04)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] hover:shadow-[0_7px_20px_rgba(23,25,23,0.06)] active:scale-[0.995] sm:px-4"
    >
      <PlatformLogo name={credential.name} platform={credential.platform} url={credential.url} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold tracking-[-0.02em] text-[var(--ink)] sm:text-[15px]">
          {credential.name}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--muted)]">
          {credential.platform || "Sin plataforma"}
        </span>
      </span>

      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-[var(--line-strong)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--muted-strong)]"
      />
    </button>
  );
}
