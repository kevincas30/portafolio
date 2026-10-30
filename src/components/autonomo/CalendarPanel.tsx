import { useState } from "react";
import { CalendarClock, Check, LoaderCircle } from "lucide-react";
import { obligationsFor, type ScheduledObligation } from "@/lib/autonomo/calendar";
import { formatShortDateWithYear } from "@/lib/dates";
import type { AutonomoSettings } from "@/types/autonomo";

interface CalendarPanelProps {
  settings: AutonomoSettings;
  today: string;
  onSaveSettings: (settings: AutonomoSettings) => Promise<void>;
}

const statusText: Record<ScheduledObligation["status"], string> = {
  filed: "Presentado",
  overdue: "Plazo vencido",
  open: "Plazo abierto",
  upcoming: "Próximo",
};

const statusTone: Record<ScheduledObligation["status"], string> = {
  filed: "bg-[var(--success-soft)] text-[var(--success-text)]",
  overdue: "bg-[var(--danger-soft)] text-[var(--danger-text)]",
  open: "bg-[#8fd3ff] text-[#171917]",
  upcoming: "bg-[var(--surface-muted)] text-[var(--muted-strong)]",
};

const stageText = {
  review: "Revisa que esté todo cargado",
  file: "Toca presentarlo",
};

const VISIBLE_UPCOMING = 4;

export function CalendarPanel({ settings, today, onSaveSettings }: CalendarPanelProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const all = obligationsFor(today, settings);

  // Lo que pide atencion (vencido o abierto) siempre a la vista; de lo proximo, solo lo primero.
  const urgent = all.filter((item) => item.status === "overdue" || item.status === "open");
  const upcoming = all.filter((item) => item.status === "upcoming");
  const filed = all.filter((item) => item.status === "filed");
  const visible = showAll ? all : [...urgent, ...upcoming.slice(0, VISIBLE_UPCOMING)];
  const hidden = all.length - visible.length;

  const toggle = async (id: string) => {
    setError("");
    setSaving(id);
    const next = settings.filed.includes(id) ? settings.filed.filter((item) => item !== id) : [...settings.filed, id];
    try {
      await onSaveSettings({ ...settings, filed: next });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted-strong)]">
          <CalendarClock aria-hidden="true" className="size-4" /> Qué presentar y cuándo
        </p>
        {filed.length > 0 && !showAll && <span className="text-xs font-bold text-[var(--muted-strong)]">{filed.length} presentados</span>}
      </div>

      {error && <p role="alert" className="mb-3 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

      {visible.length === 0 ? (
        <p className="text-sm font-bold text-[var(--muted-strong)]">No hay nada pendiente.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {visible.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[var(--ink)]">
                  Modelo {item.model} · {item.title} <span className="font-bold text-[var(--muted-strong)]">({item.period})</span>
                </p>
                <p className="text-xs text-[var(--muted-strong)]">
                  Del {formatShortDateWithYear(item.start)} al {formatShortDateWithYear(item.end)}
                  {item.stage && <span className="font-extrabold text-[var(--ink)]"> · {stageText[item.stage]}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-extrabold sm:inline ${statusTone[item.status]}`}>{statusText[item.status]}</span>
                <button
                  type="button"
                  onClick={() => void toggle(item.id)}
                  disabled={saving !== null}
                  aria-pressed={item.status === "filed"}
                  aria-label={item.status === "filed" ? `Desmarcar ${item.model} ${item.period} como presentado` : `Marcar ${item.model} ${item.period} como presentado`}
                  className={`grid size-9 place-items-center rounded-full border transition disabled:opacity-60 ${item.status === "filed" ? "border-transparent bg-[var(--success-soft)] text-[var(--success-text)]" : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}
                >
                  {saving === item.id ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(hidden > 0 || showAll) && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 min-h-9 w-full rounded-full border border-[var(--line)] text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">
          {showAll ? "Ver menos" : `Ver todo (${hidden} más)`}
        </button>
      )}
      <p className="mt-3 text-xs text-[var(--muted-strong)]">Si domicilias el pago, el plazo termina unos días antes. Si no facturaste nada, igual se presentan en cero.</p>
    </section>
  );
}
