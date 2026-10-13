import { Plus } from "lucide-react";
import { formatAmount } from "@/lib/client-status";

interface ClientsHeaderProps {
  overdueCount: number;
  upcomingCount: number;
  totalPaid: number;
  onCreate: () => void;
}

export function ClientsHeader({ overdueCount, upcomingCount, totalPaid, onCreate }: ClientsHeaderProps) {
  return (
    <header className="relative isolate overflow-hidden rounded-[22px] bg-[#c9f568] px-5 py-4 text-[#171917] shadow-[0_14px_38px_rgba(201,245,104,0.3)] sm:px-7 sm:py-5 lg:px-8">
      <div className="absolute -right-12 -top-20 -z-10 size-52 rounded-full border-[34px] border-[#171917]/8" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.35rem,4.5vw,2rem)] font-bold leading-tight tracking-[-0.03em]">Tus clientes y suscripciones</h1>
          {(overdueCount > 0 || upcomingCount > 0) && (
            <p className="mt-1.5 text-sm font-bold">
              {overdueCount > 0 && <span>{overdueCount} {overdueCount === 1 ? "atrasado" : "atrasados"}</span>}
              {overdueCount > 0 && upcomingCount > 0 && " · "}
              {upcomingCount > 0 && <span>{upcomingCount} por vencer pronto</span>}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {totalPaid > 0 && (
            <p className="text-sm font-bold">
              Total cobrado: <span className="font-extrabold">{formatAmount(totalPaid)}</span>
            </p>
          )}
          <button type="button" onClick={onCreate} className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-full bg-[#171917] px-3.5 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(23,25,23,0.25)] transition hover:bg-[#2f322c] active:scale-[0.98] sm:text-sm">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.8} />
            Nuevo cliente
          </button>
        </div>
      </div>
    </header>
  );
}
