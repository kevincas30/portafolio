import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { FinanceDialog, inputClass, labelClass, primaryButtonClass } from "@/components/finances/FinanceDialog";
import type { AutonomoSettings } from "@/types/autonomo";

interface AutonomoSettingsFormProps {
  settings: AutonomoSettings;
  onSave: (settings: AutonomoSettings) => Promise<void>;
  onClose: () => void;
}

export function AutonomoSettingsForm({ settings, onSave, onClose }: AutonomoSettingsFormProps) {
  const [activityStart, setActivityStart] = useState(settings.activityStart ?? "");
  const [professional, setProfessional] = useState(settings.professional);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSave({ activityStart: activityStart || null, professional });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron guardar los ajustes.");
      setSubmitting(false);
    }
  };

  return (
    <FinanceDialog eyebrow="Autónomo" title="Tu actividad" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <label className="block">
          <span className={labelClass}>Fecha de alta en Hacienda</span>
          <input type="date" value={activityStart} onChange={(event) => setActivityStart(event.target.value)} className={inputClass} />
          <span className="mt-2 block text-xs text-[var(--muted-strong)]">Con ella se sugiere el 7% de retención el año de alta y los dos siguientes; después, el 15%.</span>
        </label>

        <label className="flex items-start gap-3 text-sm font-bold text-[var(--ink)]">
          <input type="checkbox" checked={professional} onChange={(event) => setProfessional(event.target.checked)} className="mt-0.5 size-4" />
          <span>
            Actividad profesional (p. ej. epígrafe 763)
            <span className="block text-xs font-medium text-[var(--muted-strong)]">Si es empresarial, tus facturas no llevan retención.</span>
          </span>
        </label>

        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
          {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />} Guardar
        </button>
      </form>
    </FinanceDialog>
  );
}
