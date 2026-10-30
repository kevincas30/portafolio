import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { FinanceDialog, inputClass, labelClass, primaryButtonClass } from "@/components/finances/FinanceDialog";
import { ACTIVITIES, findActivity } from "@/lib/autonomo/activities";
import type { AutonomoSettings } from "@/types/autonomo";

interface AutonomoSettingsFormProps {
  settings: AutonomoSettings;
  onSave: (settings: AutonomoSettings) => Promise<void>;
  onClose: () => void;
}

const OTHER = "other";

export function AutonomoSettingsForm({ settings, onSave, onClose }: AutonomoSettingsFormProps) {
  const [activityStart, setActivityStart] = useState(settings.activityStart ?? "");
  // Un epigrafe fuera del catalogo (o sin elegir pero ya guardado como profesional) se edita como "Otro".
  const [choice, setChoice] = useState(findActivity(settings.epigrafe)?.code ?? (settings.epigrafe ? OTHER : ""));
  const [otherCode, setOtherCode] = useState(findActivity(settings.epigrafe) ? "" : settings.epigrafe);
  const [otherProfessional, setOtherProfessional] = useState(settings.professional);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selected = findActivity(choice);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!choice) return setError("Elige tu epígrafe del IAE.");
    if (choice === OTHER && !otherCode.trim()) return setError("Escribe el código del epígrafe.");
    const epigrafe = choice === OTHER ? otherCode.trim() : choice;
    const professional = selected ? selected.professional : otherProfessional;
    setSubmitting(true);
    try {
      await onSave({ ...settings, activityStart: activityStart || null, epigrafe, professional });
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

        <label className="block">
          <span className={labelClass}>Epígrafe del IAE *</span>
          <select value={choice} onChange={(event) => setChoice(event.target.value)} className={inputClass}>
            <option value="" disabled>Elige tu epígrafe</option>
            <optgroup label="Sección 2.ª · Profesionales (con retención)">
              {ACTIVITIES.filter((activity) => activity.section === 2).map((activity) => (
                <option key={activity.code} value={activity.code}>{activity.code} · {activity.label}</option>
              ))}
            </optgroup>
            <optgroup label="Sección 1.ª · Empresariales (sin retención)">
              {ACTIVITIES.filter((activity) => activity.section === 1).map((activity) => (
                <option key={activity.code} value={activity.code}>{activity.code} · {activity.label}</option>
              ))}
            </optgroup>
            <option value={OTHER}>Otro epígrafe…</option>
          </select>
          {selected && (
            <span className="mt-2 block text-xs text-[var(--muted-strong)]">
              {selected.professional
                ? "Actividad profesional: tus facturas a empresas y autónomos en España llevan retención."
                : "Actividad empresarial: tus facturas no llevan retención."}
            </span>
          )}
        </label>

        {choice === OTHER && (
          <div className="space-y-4 rounded-2xl bg-[var(--surface-muted)] p-4">
            <label className="block">
              <span className={labelClass}>Código del epígrafe *</span>
              <input value={otherCode} onChange={(event) => setOtherCode(event.target.value)} maxLength={12} placeholder="Por ejemplo, 769" className={inputClass} />
            </label>
            <label className="flex items-start gap-3 text-sm font-bold text-[var(--ink)]">
              <input type="checkbox" checked={otherProfessional} onChange={(event) => setOtherProfessional(event.target.checked)} className="mt-0.5 size-4" />
              <span>
                Es de la sección 2.ª (actividad profesional)
                <span className="block text-xs font-medium text-[var(--muted-strong)]">Si es de la sección 1.ª (empresarial), tus facturas no llevan retención.</span>
              </span>
            </label>
          </div>
        )}

        <p className="text-xs text-[var(--muted-strong)]">Cada persona del equipo tiene su propia bóveda: estos datos son solo tuyos. Confirma el epígrafe con la gestoría.</p>

        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
          {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />} Guardar
        </button>
      </form>
    </FinanceDialog>
  );
}
