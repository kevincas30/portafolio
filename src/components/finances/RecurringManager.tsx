import { useState, type FormEvent } from "react";
import { LoaderCircle, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { CategoryDot, FinanceDialog, inputClass, KindToggle, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/finances/FinanceDialog";
import { UNCATEGORIZED_COLOR } from "@/lib/finance/defaults";
import { amountToInput, formatAmount, parseAmount } from "@/lib/finance/money";
import { monthOf } from "@/lib/finance/months";
import { monthlyFixedExpense, nextRecurringDate, resumeRule } from "@/lib/finance/recurring";
import { formatMediumDate, getTodayKey } from "@/lib/dates";
import type { EntryKind, FinanceCategory, RecurringRule } from "@/types/finance";

interface RecurringManagerProps {
  rules: RecurringRule[];
  categories: FinanceCategory[];
  /** Guarda la lista completa y devuelve cuantos movimientos anoto. */
  onSave: (rules: RecurringRule[]) => Promise<number>;
  onCreated: (count: number) => void;
  onClose: () => void;
}

interface Draft {
  kind: EntryKind;
  amount: string;
  categoryId: string;
  note: string;
  day: string;
  startMonth: string;
}

function emptyDraft(categories: FinanceCategory[]): Draft {
  const today = getTodayKey();
  return {
    kind: "expense",
    amount: "",
    categoryId: categories.find((category) => category.kind === "expense" && !category.archived)?.id ?? "",
    note: "",
    day: String(Number(today.slice(8, 10))),
    startMonth: monthOf(today),
  };
}

export function RecurringManager({ rules, categories, onSave, onCreated, onClose }: RecurringManagerProps) {
  const [editing, setEditing] = useState<RecurringRule | "new" | null>(rules.length === 0 ? "new" : null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(categories));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const lookup = new Map(categories.map((category) => [category.id, category]));

  const run = async (next: RecurringRule[]) => {
    setError("");
    setSubmitting(true);
    try {
      const created = await onSave(next);
      if (created > 0) onCreated(created);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el gasto fijo.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (rule: RecurringRule) => {
    setDraft({ kind: rule.kind, amount: amountToInput(rule.amount), categoryId: rule.categoryId, note: rule.note, day: String(rule.day), startMonth: rule.startMonth });
    setEditing(rule);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = parseAmount(draft.amount);
    const day = Number(draft.day);
    if (!draft.note.trim()) return setError("Ponle un nombre, por ejemplo «Alquiler».");
    if (amount === null) return setError("Escribe un monto válido.");
    if (!Number.isInteger(day) || day < 1 || day > 31) return setError("El día tiene que ser entre 1 y 31.");
    if (!/^\d{4}-\d{2}$/.test(draft.startMonth)) return setError("Elige el mes en que empieza.");
    if (!draft.categoryId) return setError("Elige una categoría.");

    const fields = { kind: draft.kind, amount, categoryId: draft.categoryId, note: draft.note.trim(), day };
    const next = editing && editing !== "new"
      ? rules.map((rule) => (rule.id === editing.id ? { ...rule, ...fields } : rule))
      : [...rules, { id: globalThis.crypto.randomUUID(), ...fields, startMonth: draft.startMonth, generatedThrough: null, active: true }];
    if (await run(next)) {
      setEditing(null);
      setDraft(emptyDraft(categories));
    }
  };

  const options = categories.filter((category) => category.kind === draft.kind && (!category.archived || category.id === draft.categoryId));
  const fixed = monthlyFixedExpense(rules);

  return (
    <FinanceDialog eyebrow="Gastos" title="Gastos e ingresos fijos" onClose={onClose} size="lg">
      <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <p className="text-xs font-semibold leading-5 text-[var(--muted-strong)]">
          Alquiler, suscripciones, sueldo… Se anotan solos cada mes el día que elijas, en cuanto abres tu bóveda.
          {fixed > 0 && <> Ahora mismo: <span className="font-extrabold text-[var(--ink)]">{formatAmount(fixed)}/mes</span> en gastos fijos.</>}
        </p>

        {rules.length > 0 && (
          <ul className="divide-y divide-[var(--line-soft)] overflow-hidden rounded-[20px] border border-[var(--line-soft)]">
            {rules.map((rule) => {
              const category = lookup.get(rule.categoryId);
              return (
                <li key={rule.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${rule.active ? "" : "opacity-60"}`}>
                  <CategoryDot color={category?.color ?? UNCATEGORIZED_COLOR} className="size-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--ink)]">{rule.note}</span>
                    <span className="block text-xs font-semibold text-[var(--muted)]">
                      {rule.active ? `Día ${rule.day} · próximo: ${formatMediumDate(nextRecurringDate(rule))}` : "En pausa"}
                    </span>
                  </span>
                  <span className={`text-sm font-extrabold tabular-nums ${rule.kind === "income" ? "text-[var(--success-text)]" : "text-[var(--ink)]"}`}>
                    {rule.kind === "income" ? "+" : "−"}{formatAmount(rule.amount)}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" disabled={submitting} onClick={() => void run(rules.map((item) => (item.id === rule.id ? (rule.active ? { ...rule, active: false } : resumeRule(rule, getTodayKey())) : item)))} aria-label={rule.active ? "Pausar" : "Reanudar"} title={rule.active ? "Pausar" : "Reanudar"} className="grid size-9 place-items-center rounded-xl text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]">
                      {rule.active ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
                    </button>
                    <button type="button" disabled={submitting} onClick={() => startEdit(rule)} aria-label="Editar" title="Editar" className="grid size-9 place-items-center rounded-xl text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]">
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" disabled={submitting} onClick={() => void run(rules.filter((item) => item.id !== rule.id))} aria-label="Borrar" title="Borrar (lo ya anotado se queda)" className="grid size-9 place-items-center rounded-xl text-[var(--danger-text)] transition hover:bg-[var(--danger-soft)]">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {editing ? (
          <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-[20px] border border-[var(--line)] p-4 sm:p-5">
            <KindToggle
              value={draft.kind}
              onChange={(kind) => setDraft((current) => ({
                ...current,
                kind,
                categoryId: categories.find((category) => category.kind === kind && !category.archived)?.id ?? "",
              }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Nombre *</span>
                <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} maxLength={80} placeholder="Alquiler" className={inputClass} autoFocus />
              </label>
              <label className="block">
                <span className={labelClass}>Monto *</span>
                <div className="relative">
                  <input value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} inputMode="decimal" placeholder="0,00" className={`${inputClass} pr-10 tabular-nums`} />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-[var(--muted)]">€</span>
                </div>
              </label>
              <label className="block">
                <span className={labelClass}>Día del mes</span>
                <input type="number" min={1} max={31} value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value })} className={inputClass} />
              </label>
              {editing === "new" && (
                <label className="block">
                  <span className={labelClass}>Empieza en</span>
                  <input type="month" value={draft.startMonth} onChange={(event) => setDraft({ ...draft, startMonth: event.target.value })} className={inputClass} />
                </label>
              )}
            </div>
            <fieldset>
              <legend className={labelClass}>Categoría *</legend>
              <div className="flex flex-wrap gap-2">
                {options.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, categoryId: category.id })}
                    aria-pressed={draft.categoryId === category.id}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${draft.categoryId === category.id ? "border-[var(--ink)] bg-[var(--accent-soft)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"}`}
                  >
                    <CategoryDot color={category.color} />
                    {category.name}
                  </button>
                ))}
              </div>
            </fieldset>
            {editing === "new" && (
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Si el día ya pasó en el mes de inicio, se anota enseguida.</p>
            )}
            {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setEditing(null); setError(""); }} disabled={submitting} className={secondaryButtonClass}>Cancelar</button>
              <button type="submit" disabled={submitting} className={primaryButtonClass}>
                {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                {editing === "new" ? "Crear" : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <>
            {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}
            <button type="button" onClick={() => { setDraft(emptyDraft(categories)); setEditing("new"); }} className={`${secondaryButtonClass} w-full`}>
              <Plus aria-hidden="true" className="size-4" /> Nuevo gasto o ingreso fijo
            </button>
          </>
        )}
      </div>
    </FinanceDialog>
  );
}
