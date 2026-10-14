import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface VaultCardProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children: ReactNode;
}

// Marco comun de las pantallas de la boveda por usuario (mismo lenguaje visual que VaultUnlock).
export function VaultCard({ icon: Icon, eyebrow, title, children }: VaultCardProps) {
  return (
    <section className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[26px] border border-[var(--line-soft)] bg-[var(--surface)] shadow-[0_14px_42px_rgba(23,25,23,0.08)]">
      <div className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#2e3127_0%,#171917_55%,#0e0f0c_100%)] px-5 py-7 text-white sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 -z-10 size-64 rounded-full border-[42px] border-[#c9f568]/10" />
        <div className="mb-5 grid size-12 place-items-center rounded-2xl border border-[#c9f568]/30 bg-[#c9f568]/15 backdrop-blur-sm">
          <Icon aria-hidden="true" className="size-6 text-[#c9f568]" />
        </div>
        <p className="mb-1 text-sm font-semibold text-white/75">{eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{title}</h1>
      </div>
      <div className="mx-auto max-w-xl px-5 py-8 sm:px-8 sm:py-10">{children}</div>
    </section>
  );
}

export const inputClass =
  "min-h-13 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] outline-none focus-visible:outline-none transition focus:border-[#c9f568] focus:ring-3 focus:ring-[#c9f568]/35";

export const primaryButtonClass =
  "flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-5 text-sm font-extrabold text-[var(--paper)] shadow-[0_8px_20px_rgba(23,25,23,0.2)] transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60";

export const secondaryButtonClass =
  "flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60";

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{message}</p>;
}
