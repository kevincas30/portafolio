import { useState, type FormEvent } from "react";
import { LoaderCircle, Repeat, Trash2 } from "lucide-react";
import { CategoryDot, FinanceDialog, inputClass, KindToggle, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/finances/FinanceDialog";
import { amountToInput, parseAmount } from "@/lib/finance/money";
import { getTodayKey } from "@/lib/dates";
import type { EntryKind, FinanceCategory, FinanceEntry, FinanceEntryDraft } from "@/types/finance";

interface EntryFormProps {
  entry?: FinanceEntry;
  categories: FinanceCategory[];
  /** Fecha sugerida para un movimiento nuevo (hoy, o un dia del mes que se esta mirando). */
  defaultDate?: string;
  onSave: (draft: FinanceEntryDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function firstCategory(categories: FinanceCategory[], kind: EntryKind): string {
  return categories.find((category) => category.kind === kind && !category.archived)?.id ?? "";
}

export function EntryForm({ entry, categories, defaultDate, onSave, onDelete, onClose }: EntryFormProps) {
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? "expense");
  const [amount, setAmount] = useState(entry ? amountToInput(entry.amount) : "");
  const [date, setDate] = useState(entry?.date ?? defaultDate ?? getTodayKey());
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? firstCategory(categories, "expense"));
  const [note, setNote] = useState(entry?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  // La categoria actual sigue visible aunque este archivada (al editar un movimiento viejo).
  const options = categories.filter((category) => category.kind === kind && (!category.archived || category.id === categoryId));

  const changeKind = (next: EntryKind) => {
    setKind(next);
    if (!categories.some((category) => category.id === categoryId && category.kind === next)) setCategoryId(firstCategory(categories, next));
  };

  const submit = async (event: FormEvent, another = false) => {
    event.preventDefault();
    setError("");
    const cents = parseAmount(amount);
    if (cents === null) return setError("Escribe un monto válido, por ejemplo 3,50.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Elige una fecha.");
    if (!categoryId) return setError("Elige una categoría.");

    setSubmitting(true);
    try {
      await onSave({ kind, amount: cents, date, categoryId, note });
      if (another) {
        // Para anotar varios gastos hormiga seguidos: se queda abierto con la misma fecha y categoria.
        setAmount("");
        setNote("");
        setSavedCount((count) => count + 1);
      } else {
        onClose();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el movimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    setSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo borrar el movimiento.");
      setSubmitting(false);
    }
  };

  return (
    <FinanceDialog eyebrow="Gastos" title={entry ? "Editar movimiento" : "Anotar movimiento"} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <KindToggle value={kind} onChange={changeKind} />

        {entry?.recurringId && (
          <p className="flex items-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-xs font-bold text-[var(--muted-strong)]">
            <Repeat aria-hidden="true" className="size-4" /> Lo anotó un gasto fijo. Cambiarlo aquí no cambia el gasto fijo.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className={labelClass}>Monto *</span>
            <div className="relative">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                autoFocus
                aria-describedby="entry-amount-suffix"
                className={`${inputClass} pr-10 text-xl tabular-nums`}
              />
              <span id="entry-amount-suffix" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base font-extrabold text-[var(--muted)]">€</span>
            </div>
          </label>
          <label className="block">
            <span className={labelClass}>Fecha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </label>
        </div>

        <fieldset>
          <legend className={labelClass}>Categoría *</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((category) => {
              const selected = category.id === categoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${selected ? "border-[var(--ink)] bg-[var(--accent-soft)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"}`}
                >
                  <CategoryDot color={category.color} />
                  {category.name}
                </button>
              );
            })}
          </div>
          {options.length === 0 && <p className="text-sm font-semibold text-[var(--muted)]">No hay categorías de este tipo. Créalas en «Categorías».</p>}
        </fieldset>

        <label className="block">
          <span className={labelClass}>Nota <span className="normal-case tracking-normal text-[var(--muted)]">(opcional)</span></span>
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={kind === "expense" ? "Cortado en el bar de la esquina" : "Pago de la web de Tinas"} className={inputClass} />
        </label>

        {savedCount > 0 && !error && (
          <p role="status" className="rounded-xl bg-[var(--success-soft)] px-3 py-2 text-sm font-bold text-[var(--success-text)]">
            {savedCount === 1 ? "Guardado. Anota el siguiente." : `${savedCount} guardados. Anota el siguiente.`}
          </p>
        )}
        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row">
          {onDelete && (
            <button type="button" onClick={() => void remove()} disabled={submitting} className={`${secondaryButtonClass} text-[var(--danger-text)] sm:mr-auto`}>
              <Trash2 aria-hidden="true" className="size-4" />
              {confirmingDelete ? "¿Seguro? Toca otra vez" : "Borrar"}
            </button>
          )}
          {!entry && (
            <button type="button" onClick={(event) => void submit(event, true)} disabled={submitting} className={`${secondaryButtonClass} sm:mr-auto`}>
              Guardar y anotar otro
            </button>
          )}
          <button type="submit" disabled={submitting} className={`${primaryButtonClass} sm:min-w-40`}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {entry ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </form>
    </FinanceDialog>
  );
}
