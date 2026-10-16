import { useState } from "react";
import { Archive, ArchiveRestore, Bug, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { FinanceDialog, inputClass, KindToggle, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/finances/FinanceDialog";
import { CATEGORY_COLORS } from "@/lib/finance/defaults";
import { amountToInput, formatAmount, parseAmount } from "@/lib/finance/money";
import type { EntryKind, FinanceCategory, FinanceSettings } from "@/types/finance";

interface CategoriesManagerProps {
  settings: FinanceSettings;
  /** Categorias con movimientos o gastos fijos: no se borran, se archivan. */
  usedCategoryIds: Set<string>;
  onSave: (settings: FinanceSettings) => Promise<void>;
  onClose: () => void;
}

interface Row extends FinanceCategory {
  budgetInput: string;
}

const toRow = (category: FinanceCategory): Row => ({ ...category, budgetInput: category.budget ? amountToInput(category.budget) : "" });

export function CategoriesManager({ settings, usedCategoryIds, onSave, onClose }: CategoriesManagerProps) {
  const [kind, setKind] = useState<EntryKind>("expense");
  const [rows, setRows] = useState<Row[]>(() => settings.categories.map(toRow));
  const [threshold, setThreshold] = useState(amountToInput(settings.antThreshold));
  const [colorFor, setColorFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const patch = (id: string, change: Partial<Row>) => setRows((list) => list.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const add = () => {
    const used = new Set(rows.map((row) => row.color));
    const color = CATEGORY_COLORS.find((item) => !used.has(item)) ?? CATEGORY_COLORS[rows.length % CATEGORY_COLORS.length];
    setRows((list) => [...list, { id: globalThis.crypto.randomUUID(), name: "", kind, color, budget: null, archived: false, ant: false, budgetInput: "" }]);
  };

  const save = async () => {
    setError("");
    const antThreshold = parseAmount(threshold);
    if (antThreshold === null) return setError("El tope del gasto hormiga tiene que ser un monto, por ejemplo 15.");

    const categories: FinanceCategory[] = [];
    for (const { budgetInput, ...row } of rows) {
      const name = row.name.trim();
      if (!name) return setError("Todas las categorías necesitan un nombre.");
      let budget: number | null = null;
      if (row.kind === "expense" && budgetInput.trim()) {
        budget = parseAmount(budgetInput);
        if (budget === null) return setError(`El presupuesto de «${name}» no es un monto válido.`);
      }
      categories.push({ ...row, name, budget });
    }

    setSubmitting(true);
    try {
      await onSave({ ...settings, categories, antThreshold });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron guardar las categorías.");
      setSubmitting(false);
    }
  };

  const visible = rows.filter((row) => row.kind === kind);
  const totalBudget = rows.reduce((sum, row) => sum + (row.kind === "expense" && !row.archived ? parseAmount(row.budgetInput) ?? 0 : 0), 0);

  return (
    <FinanceDialog eyebrow="Gastos" title="Categorías y presupuestos" onClose={onClose} size="lg">
      <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <KindToggle value={kind} onChange={setKind} />

        {kind === "expense" && (
          <p className="text-xs font-semibold leading-5 text-[var(--muted-strong)]">
            Pon un tope mensual a las categorías que quieras vigilar. Te avisamos al llegar al 80 %.
            {totalBudget > 0 && <> Presupuesto total: <span className="font-extrabold text-[var(--ink)]">{formatAmount(totalBudget)}/mes</span>.</>}
          </p>
        )}

        <ul className="space-y-2">
          {visible.map((row) => {
            const used = usedCategoryIds.has(row.id);
            return (
              <li key={row.id} className={`rounded-2xl border border-[var(--line-soft)] p-2 ${row.archived ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setColorFor(colorFor === row.id ? null : row.id)}
                    aria-label={`Color de ${row.name || "la categoría"}`}
                    aria-expanded={colorFor === row.id}
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] transition hover:bg-[var(--surface-muted)]"
                  >
                    <span className="size-5 rounded-full" style={{ backgroundColor: row.color }} />
                  </button>
                  <input
                    value={row.name}
                    onChange={(event) => patch(row.id, { name: event.target.value })}
                    maxLength={40}
                    placeholder="Nombre"
                    aria-label="Nombre de la categoría"
                    className={`${inputClass} min-h-10 min-w-0 flex-1 basis-40`}
                  />
                  {kind === "expense" && (
                    <div className="relative w-32">
                      <input
                        value={row.budgetInput}
                        onChange={(event) => patch(row.id, { budgetInput: event.target.value })}
                        inputMode="decimal"
                        placeholder="Sin tope"
                        aria-label={`Presupuesto mensual de ${row.name || "la categoría"}`}
                        className={`${inputClass} min-h-10 pr-12 tabular-nums`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-[var(--muted)]">€/mes</span>
                    </div>
                  )}
                  {kind === "expense" && (
                    <button
                      type="button"
                      onClick={() => patch(row.id, { ant: !row.ant })}
                      aria-pressed={row.ant}
                      aria-label={`${row.name || "La categoría"} cuenta como gasto hormiga`}
                      title={row.ant ? "Cuenta como hormiga" : "No cuenta como hormiga"}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-extrabold transition ${row.ant ? "border-[var(--charge-border)] bg-[var(--charge-soft)] text-[var(--charge-text)]" : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}
                    >
                      <Bug aria-hidden="true" className="size-4" /> Hormiga
                    </button>
                  )}
                  {used ? (
                    <button
                      type="button"
                      onClick={() => patch(row.id, { archived: !row.archived })}
                      aria-label={row.archived ? "Recuperar categoría" : "Archivar categoría"}
                      title={row.archived ? "Recuperar" : "Archivar: tiene movimientos, así que no se borra"}
                      className="grid size-10 place-items-center rounded-xl text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]"
                    >
                      {row.archived ? <ArchiveRestore aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRows((list) => list.filter((item) => item.id !== row.id))}
                      aria-label="Borrar categoría"
                      className="grid size-10 place-items-center rounded-xl text-[var(--danger-text)] transition hover:bg-[var(--danger-soft)]"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </div>
                {colorFor === row.id && (
                  <div className="mt-2 flex flex-wrap gap-1.5 px-1 pb-1">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => { patch(row.id, { color }); setColorFor(null); }}
                        aria-label={`Elegir color ${color}`}
                        aria-pressed={row.color === color}
                        className={`size-8 rounded-full border-2 transition ${row.color === color ? "border-[var(--ink)]" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button type="button" onClick={add} className={`${secondaryButtonClass} w-full`}>
          <Plus aria-hidden="true" className="size-4" /> Nueva categoría de {kind === "expense" ? "gasto" : "ingreso"}
        </button>

        <label className="block border-t border-[var(--line)] pt-5">
          <span className={labelClass}>Gasto hormiga</span>
          <span className="mb-2 block text-xs font-semibold leading-5 text-[var(--muted-strong)]">
            Cuenta como hormiga un gasto suelto de hasta este monto en una categoría marcada con <Bug aria-hidden="true" className="inline size-3.5 align-[-2px]" /> Hormiga.
            Los gastos fijos y las categorías necesarias (súper, internet, transporte…) nunca cuentan.
          </span>
          <div className="relative w-40">
            <input value={threshold} onChange={(event) => setThreshold(event.target.value)} inputMode="decimal" className={`${inputClass} pr-10 tabular-nums`} />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-[var(--muted)]">€</span>
          </div>
        </label>

        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5">
          <button type="button" onClick={onClose} disabled={submitting} className={secondaryButtonClass}>Cancelar</button>
          <button type="button" onClick={() => void save()} disabled={submitting} className={primaryButtonClass}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </FinanceDialog>
  );
}
