import { FileUp, Lock, Plus } from "lucide-react";

interface PasswordsHeaderProps {
  onCreate: () => void;
  onImport: () => void;
  onLock: () => void;
}

export function PasswordsHeader({ onCreate, onImport, onLock }: PasswordsHeaderProps) {
  return (
    <header className="relative isolate overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#2e3127_0%,#171917_55%,#0e0f0c_100%)] px-5 py-4 text-white shadow-[0_14px_38px_rgba(23,25,23,0.28)] sm:px-7 sm:py-5 lg:px-8">
      <div className="absolute -right-12 -top-20 -z-10 size-52 rounded-full border-[34px] border-[#c9f568]/10" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-[clamp(1.35rem,4.5vw,2rem)] font-bold leading-tight tracking-[-0.03em]">Tus accesos en un solo lugar</h1>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onLock} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3.5 text-xs font-bold backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98] sm:text-sm">
            <Lock aria-hidden="true" className="size-4" />
            Bloquear
          </button>
          <button type="button" onClick={onImport} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3.5 text-xs font-bold backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98] sm:text-sm">
            <FileUp aria-hidden="true" className="size-4" />
            Importar
          </button>
          <button type="button" onClick={onCreate} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-[#c9f568] px-3.5 text-xs font-extrabold text-[#171917] shadow-[0_6px_16px_rgba(201,245,104,0.25)] transition hover:bg-[#d5fa83] active:scale-[0.98] sm:text-sm">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.8} />
            Nueva cuenta
          </button>
        </div>
      </div>
    </header>
  );
}
