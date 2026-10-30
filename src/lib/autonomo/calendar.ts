// Calendario fiscal de la guia (pag. 07 y 08): que se presenta, cuando y en que punto esta.
import type { Quarter } from "@/lib/autonomo/invoice";
import { filingDeadline } from "@/lib/autonomo/taxes";
import type { AutonomoSettings } from "@/types/autonomo";

export type FilingModel = "303" | "130" | "390" | "100";

export interface FilingObligation {
  /** `303-2026-3`, `390-2026`, `100-2026`: tambien es la clave en `settings.filed`. */
  id: string;
  model: FilingModel;
  title: string;
  period: string;
  /** Ultimo dia del periodo declarado: decide si ya eras autonomo. */
  periodEnd: string;
  start: string;
  end: string;
}

export type FilingStatus = "filed" | "overdue" | "open" | "upcoming";

export interface ScheduledObligation extends FilingObligation {
  status: FilingStatus;
  /** Con el plazo abierto: del dia 1 al 9 se revisa que este todo cargado y desde el 10 se presenta. */
  stage: "review" | "file" | null;
}

const QUARTERS: Quarter[] = [1, 2, 3, 4];
const QUARTER_END = ["03-31", "06-30", "09-30", "12-31"];
const FILE_FROM_DAY = 10;

const titles: Record<FilingModel, string> = {
  "303": "IVA trimestral",
  "130": "IRPF trimestral",
  "390": "Resumen anual de IVA",
  "100": "Declaración de la renta",
};

export function filingObligations(year: number): FilingObligation[] {
  const quarterly = QUARTERS.flatMap((quarter) => {
    const end = filingDeadline(year, quarter);
    const start = `${end.slice(0, 7)}-01`;
    const periodEnd = `${year}-${QUARTER_END[quarter - 1]}`;
    return (["303", "130"] as const).map((model) => ({ id: `${model}-${year}-${quarter}`, model, title: titles[model], period: `${quarter}T ${year}`, periodEnd, start, end }));
  });
  const yearEnd = `${year}-12-31`;
  return [
    ...quarterly,
    { id: `390-${year}`, model: "390", title: titles["390"], period: String(year), periodEnd: yearEnd, start: `${year + 1}-01-01`, end: `${year + 1}-01-30` },
    // La campaña suele abrir a principios de abril; la fecha exacta la publica la AEAT cada año.
    { id: `100-${year}`, model: "100", title: titles["100"], period: String(year), periodEnd: yearEnd, start: `${year + 1}-04-01`, end: `${year + 1}-06-30` },
  ];
}

function statusOf(obligation: FilingObligation, today: string, filed: Set<string>): FilingStatus {
  if (filed.has(obligation.id)) return "filed";
  if (obligation.end < today) return "overdue";
  return obligation.start <= today ? "open" : "upcoming";
}

/**
 * Obligaciones desde el alta hasta el año en curso (sin alta, solo las del año en curso), por plazo.
 * Se recorren todos los años desde el alta para que lo vencido sin presentar nunca desaparezca.
 */
export function obligationsFor(today: string, settings: AutonomoSettings): ScheduledObligation[] {
  const year = Number(today.slice(0, 4));
  const filed = new Set(settings.filed);
  const from = settings.activityStart ?? `${year}-01-01`;
  // El 4T y la renta del año anterior se presentan este año: ese año fiscal entra siempre.
  const firstYear = Math.min(Number(from.slice(0, 4)), year - 1);
  return Array.from({ length: year - firstYear + 1 }, (_, index) => firstYear + index)
    .flatMap(filingObligations)
    .filter((obligation) => obligation.periodEnd >= from)
    .map((obligation, index) => ({ obligation, index }))
    .sort((a, b) => a.obligation.end.localeCompare(b.obligation.end) || a.index - b.index)
    .map(({ obligation }) => {
      const status = statusOf(obligation, today, filed);
      const quarterly = obligation.model === "303" || obligation.model === "130" || obligation.model === "390";
      const stage = status === "open" && quarterly ? (Number(today.slice(8, 10)) >= FILE_FROM_DAY ? "file" : "review") : null;
      return { ...obligation, status, stage };
    });
}