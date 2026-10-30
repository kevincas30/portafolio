import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { FinanceDialog } from "@/components/finances/FinanceDialog";
import { ROADMAP } from "@/lib/autonomo/roadmap";
import type { AutonomoSettings } from "@/types/autonomo";

interface RoadmapDialogProps {
  settings: AutonomoSettings;
  onSave: (settings: AutonomoSettings) => Promise<void>;
  onClose: () => void;
}

export function RoadmapDialog({ settings, onSave, onClose }: RoadmapDialogProps) {
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const done = new Set(settings.roadmapDone);

  const toggle = async (step: number) => {
    setError("");
    setSaving(step);
    const next = done.has(step) ? settings.roadmapDone.filter((item) => item !== step) : [...settings.roadmapDone, step].sort((a, b) => a - b);
    try {
      await onSave({ ...settings, roadmapDone: next });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <FinanceDialog eyebrow={`Hoja de ruta · ${done.size}/${ROADMAP.length}`} title="Los pasos, en orden" onClose={onClose}>
      <div className="space-y-3 px-5 py-6 sm:px-7 sm:py-7">
        <p className="text-sm text-[var(--muted-strong)]">El orden importa: no emitas ninguna factura antes del paso 6.</p>
        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}
        <ol className="space-y-2">
          {ROADMAP.map(({ step, title, detail }) => {
            const checked = done.has(step);
            return (
              <li key={step}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={saving !== null}
                  onClick={() => void toggle(step)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 text-left transition hover:bg-[var(--surface-muted)] disabled:opacity-70"
                >
                  <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${checked ? "bg-[var(--success-soft)] text-[var(--success-text)]" : "bg-[var(--surface-muted)] text-[var(--ink)]"}`}>
                    {saving === step ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : checked ? <Check aria-hidden="true" className="size-3.5" /> : step}
                  </span>
                  <span>
                    <span className={`block text-sm font-extrabold ${checked ? "text-[var(--muted-strong)] line-through" : "text-[var(--ink)]"}`}>{title}</span>
                    <span className="block text-xs text-[var(--muted-strong)]">{detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </FinanceDialog>
  );
}
