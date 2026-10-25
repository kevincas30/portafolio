import { useState, type FormEvent } from "react";
import { Building2, CalendarDays, LoaderCircle, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { MemberAvatar } from "@/components/clients/OwnerAvatars";
import { CategoryDot, FinanceDialog, inputClass, KindToggle, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/finances/FinanceDialog";
import { billingIntervalLabels } from "@/config/subscription-types";
import { teamMembers } from "@/lib/client-owner";
import { coverageLabel, importClientPayments, lastPayment, myServices } from "@/lib/finance/client-income";
import { UNCATEGORIZED_COLOR } from "@/lib/finance/defaults";
import { amountToInput, formatAmount, parseAmount } from "@/lib/finance/money";
import { formatMonth, formatMonthName, monthOf } from "@/lib/finance/months";
import { monthlyFixedExpense, nextRecurringDate, resumeRule, runRecurring, type PendingEntry } from "@/lib/finance/recurring";
import { formatMediumDate, formatShortDateWithYear, getTodayKey } from "@/lib/dates";
import type { Client } from "@/types/client";
import type { EntryKind, FinanceCategory, FinanceSettings, RecurringFrequency, RecurringRule } from "@/types/finance";

interface RecurringManagerProps {
  rules: RecurringRule[];
  categories: FinanceCategory[];
  clients: Client[];
  teamMemberId: string | null;
  /** Guarda la lista completa (y quien soy en el equipo) y devuelve cuantos movimientos anoto. */
  onSave: (rules: RecurringRule[], patch?: Pick<FinanceSettings, "teamMemberId">) => Promise<number>;
  onCreated: (count: number) => void;
  onClose: () => void;
}

type Source = "date" | "client";

interface Draft {
  kind: EntryKind;
  source: Source;
  subscriptionId: string;
  amount: string;
  categoryId: string;
  note: string;
  day: string;
  startMonth: string;
  frequency: RecurringFrequency;
}

function defaultCategory(categories: FinanceCategory[], kind: EntryKind, preferred?: string): string {
  const options = categories.filter((category) => category.kind === kind && !category.archived);
  return options.find((category) => category.id === preferred)?.id ?? options[0]?.id ?? "";
}

function emptyDraft(categories: FinanceCategory[]): Draft {
  const today = getTodayKey();
  return {
    kind: "expense",
    source: "date",
    subscriptionId: "",
    amount: "",
    categoryId: defaultCategory(categories, "expense"),
    note: "",
    day: String(Number(today.slice(8, 10))),
    startMonth: monthOf(today),
    frequency: "monthly",
  };
}

const frequencyUnit = (frequency: RecurringFrequency | undefined) => (frequency === "yearly" ? "año" : "mes");

const chipClass = (selected: boolean) =>
  `inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${selected ? "border-[var(--ink)] bg-[var(--accent-soft)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"}`;

export function RecurringManager({ rules, categories, clients, teamMemberId, onSave, onCreated, onClose }: RecurringManagerProps) {
  const [editing, setEditing] = useState<RecurringRule | "new" | null>(rules.length === 0 ? "new" : null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(categories));
  const [memberId, setMemberId] = useState<string | null>(teamMemberId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const lookup = new Map(categories.map((category) => [category.id, category]));
  const subscriptions = new Map(clients.flatMap((client) => client.subscriptions.map((subscription) => [subscription.id, subscription] as const)));

  const linkedIds = new Set(rules.flatMap((rule) => (rule.subscriptionId && (editing === "new" || rule.id !== editing?.id) ? [rule.subscriptionId] : [])));
  const services = myServices(clients, memberId).filter((option) => !linkedIds.has(option.subscription.id));
  const isLinked = draft.source === "client";

  const run = async (next: RecurringRule[]) => {
    setError("");
    setSubmitting(true);
    try {
      const created = await onSave(next, memberId !== teamMemberId ? { teamMemberId: memberId } : undefined);
      if (created > 0) onCreated(created);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el fijo.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (rule: RecurringRule) => {
    setDraft({
      kind: rule.kind,
      source: rule.subscriptionId ? "client" : "date",
      subscriptionId: rule.subscriptionId ?? "",
      amount: amountToInput(rule.amount),
      categoryId: rule.categoryId,
      note: rule.note,
      day: String(rule.day),
      startMonth: rule.startMonth,
      frequency: rule.frequency ?? "monthly",
    });
    setEditing(rule);
  };

  const chooseService = (subscriptionId: string) => {
    const option = services.find((item) => item.subscription.id === subscriptionId);
    setDraft((current) => ({ ...current, subscriptionId, note: option?.label ?? current.note }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const note = draft.note.trim();
    if (!draft.categoryId) return setError("Elige una categoría.");

    if (isLinked) {
      const subscription = subscriptions.get(draft.subscriptionId);
      if (!subscription) return setError("Elige el servicio del cliente.");
      if (!note) return setError("Ponle un nombre.");
      const fields = { categoryId: draft.categoryId, note, amount: Math.round(subscription.amount * 100) };
      const next = editing && editing !== "new"
        ? rules.map((rule) => (rule.id === editing.id ? { ...rule, ...fields } : rule))
        : [...rules, {
            id: globalThis.crypto.randomUUID(), kind: "income" as const, ...fields, day: 1, startMonth: monthOf(getTodayKey()),
            generatedThrough: null, active: true, subscriptionId: subscription.id, importedPaymentIds: [],
          }];
      if (await run(next)) close();
      return;
    }

    const amount = parseAmount(draft.amount);
    const day = Number(draft.day);
    if (!note) return setError("Ponle un nombre, por ejemplo «Alquiler».");
    if (amount === null) return setError("Escribe un monto válido.");
    if (!Number.isInteger(day) || day < 1 || day > 31) return setError("El día tiene que ser entre 1 y 31.");
    if (!/^\d{4}-\d{2}$/.test(draft.startMonth)) return setError("Elige el mes en que empieza.");

    const fields = { kind: draft.kind, amount, categoryId: draft.categoryId, note, day };
    const next = editing && editing !== "new"
      ? rules.map((rule) => (rule.id === editing.id ? { ...rule, ...fields } : rule))
      : [...rules, { id: globalThis.crypto.randomUUID(), ...fields, startMonth: draft.startMonth, frequency: draft.frequency, generatedThrough: null, active: true }];
    if (await run(next)) close();
  };

  const close = () => {
    setEditing(null);
    setDraft(emptyDraft(categories));
    setError("");
  };

  const options = categories.filter((category) => category.kind === draft.kind && (!category.archived || category.id === draft.categoryId));
  const fixed = monthlyFixedExpense(rules);
  const hasYearlyExpense = rules.some((rule) => rule.active && rule.kind === "expense" && !rule.subscriptionId && rule.frequency === "yearly");
  const editingLinked = editing !== null && editing !== "new" && Boolean(editing.subscriptionId);
  const selectedSubscription = subscriptions.get(draft.subscriptionId);

  // Lo que se va a anotar al tocar Crear, calculado con las mismas funciones que despues lo anotan.
  const preview = ((): { entries: PendingEntry[]; next: string } | null => {
    if (editing !== "new") return null;
    let counter = 0;
    const previewId = () => `preview-${++counter}`;
    if (isLinked) {
      if (!selectedSubscription) return null;
      const rule: RecurringRule = {
        id: "preview", kind: "income", amount: Math.round(selectedSubscription.amount * 100), categoryId: draft.categoryId,
        note: draft.note.trim(), day: 1, startMonth: monthOf(getTodayKey()), generatedThrough: null, active: true,
        subscriptionId: selectedSubscription.id, importedPaymentIds: [],
      };
      const unit = selectedSubscription.billingInterval === "monthly" ? "mes" : "año";
      return {
        entries: importClientPayments([rule], clients, memberId, previewId).entries,
        next: `Después: cada pago que registres en Clientes. Próximo cobro esperado el ${formatMediumDate(selectedSubscription.nextDueDate)} (precio ${formatAmount(rule.amount)}/${unit}).`,
      };
    }
    const amount = parseAmount(draft.amount);
    const day = Number(draft.day);
    if (amount === null || !Number.isInteger(day) || day < 1 || day > 31 || !/^\d{4}-\d{2}$/.test(draft.startMonth)) return null;
    const rule: RecurringRule = {
      id: "preview", kind: draft.kind, amount, categoryId: draft.categoryId, note: draft.note.trim(), day,
      startMonth: draft.startMonth, frequency: draft.frequency, generatedThrough: null, active: true,
    };
    const run = runRecurring([rule], getTodayKey(), previewId);
    return { entries: run.entries, next: `Después: ${draft.kind === "income" ? "+" : "−"}${formatAmount(amount)} cada ${frequencyUnit(draft.frequency)}, el próximo el ${formatMediumDate(nextRecurringDate(run.rules[0]))}.` };
  })();

  return (
    <FinanceDialog eyebrow="Gastos" title="Gastos e ingresos fijos" onClose={onClose} size="lg">
      <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <p className="text-xs font-semibold leading-5 text-[var(--muted-strong)]">
          Alquiler, suscripciones, sueldo, el seguro anual… Se anotan solos cada mes o cada año el día que elijas, en cuanto abres tu bóveda.
          Los servicios de tus clientes se anotan cuando registras el pago en Clientes.
          {fixed > 0 && <> Ahora mismo: <span className="font-extrabold text-[var(--ink)]">{formatAmount(fixed)}/mes</span> en gastos fijos{hasYearlyExpense && " (los anuales, repartidos en 12 meses)"}.</>}
        </p>

        {rules.length > 0 && (
          <ul className="divide-y divide-[var(--line-soft)] overflow-hidden rounded-[20px] border border-[var(--line-soft)]">
            {rules.map((rule) => {
              const category = lookup.get(rule.categoryId);
              const subscription = rule.subscriptionId ? subscriptions.get(rule.subscriptionId) : undefined;
              // En los enlazados, el monto grande es el ultimo pago anotado (lo que entro), no el precio del servicio.
              const last = subscription ? lastPayment(subscription) : null;
              let detail: string;
              if (!rule.active) detail = "En pausa";
              else if (rule.subscriptionId) {
                detail = subscription
                  ? `Al registrar el pago · precio ${formatAmount(Math.round(subscription.amount * 100))}/${subscription.billingInterval === "monthly" ? "mes" : "año"} · próximo cobro: ${formatMediumDate(subscription.nextDueDate)}`
                  : "Al registrar el pago · el servicio ya no está en tus clientes";
              } else detail = `${rule.frequency === "yearly" ? "Cada año" : `Día ${rule.day}`} · próximo: ${formatMediumDate(nextRecurringDate(rule))}`;
              return (
                <li key={rule.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${rule.active ? "" : "opacity-60"}`}>
                  <CategoryDot color={category?.color ?? UNCATEGORIZED_COLOR} className="size-3" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-bold text-[var(--ink)]">
                      {rule.subscriptionId && <Building2 aria-label="Servicio de cliente" className="size-3.5 shrink-0 text-[var(--muted-strong)]" />}
                      {rule.note}
                    </span>
                    <span className="block text-xs font-semibold text-[var(--muted)]">{detail}</span>
                  </span>
                  {rule.subscriptionId ? (
                    <span className="text-right">
                      <span className={`block text-sm font-extrabold tabular-nums ${last ? "text-[var(--success-text)]" : "text-[var(--muted)]"}`}>
                        {last ? `+${formatAmount(Math.round(last.amount * 100))}` : "—"}
                      </span>
                      <span className="block text-[11px] font-bold text-[var(--muted)]">
                        {last && subscription ? `último pago · ${coverageLabel(last.periods, subscription.billingInterval)}` : "sin pagos"}
                      </span>
                    </span>
                  ) : (
                    <span className={`text-sm font-extrabold tabular-nums ${rule.kind === "income" ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"}`}>
                      {rule.kind === "income" ? "+" : "−"}{formatAmount(rule.amount)}
                      {rule.frequency === "yearly" && <span className="text-xs font-bold">/año</span>}
                    </span>
                  )}
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
            {!editingLinked && (
              <KindToggle
                value={draft.kind}
                onChange={(kind) => setDraft((current) => ({
                  ...current,
                  kind,
                  source: kind === "income" ? current.source : "date",
                  categoryId: defaultCategory(categories, kind, kind === "income" && current.source === "client" ? "clientes" : undefined),
                }))}
              />
            )}

            {draft.kind === "income" && editing === "new" && (
              <div role="radiogroup" aria-label="Origen del ingreso" className="grid gap-2 sm:grid-cols-2">
                {([
                  { id: "date", label: "Día fijo del mes", hint: "Sueldo, alquiler que cobras…", icon: CalendarDays },
                  { id: "client", label: "Servicio de un cliente", hint: "Se anota al registrar el pago", icon: Building2 },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={draft.source === option.id}
                    onClick={() => setDraft((current) => ({
                      ...current,
                      source: option.id,
                      subscriptionId: "",
                      categoryId: defaultCategory(categories, "income", option.id === "client" ? "clientes" : current.categoryId),
                    }))}
                    className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${draft.source === option.id ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:bg-[var(--surface-muted)]"}`}
                  >
                    <option.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--ink)]" />
                    <span>
                      <span className="block text-sm font-extrabold text-[var(--ink)]">{option.label}</span>
                      <span className="block text-xs font-semibold text-[var(--muted-strong)]">{option.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {isLinked && editing === "new" && (
              <>
                <fieldset>
                  <legend className={labelClass}>¿Quién eres en el equipo?</legend>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers().map((member) => (
                      <button key={member.id} type="button" onClick={() => { setMemberId(member.id); setDraft((current) => ({ ...current, subscriptionId: "" })); }} aria-pressed={memberId === member.id} className={`${chipClass(memberId === member.id)} pl-1`}>
                        <MemberAvatar member={member} />
                        {member.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Se recuerda en tu bóveda. Solo salen los clientes de los que eres el único responsable.</p>
                </fieldset>

                {memberId && (
                  <fieldset>
                    <legend className={labelClass}>Servicio *</legend>
                    {services.length === 0 ? (
                      <p className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--muted-strong)]">
                        No hay servicios para enlazar. Asígnate como responsable de un cliente en Clientes (o ya están todos enlazados).
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {services.map((option) => {
                          const selected = draft.subscriptionId === option.subscription.id;
                          const count = option.subscription.payments.length;
                          const last = lastPayment(option.subscription);
                          return (
                            <li key={option.subscription.id}>
                              <button type="button" role="radio" aria-checked={selected} onClick={() => chooseService(option.subscription.id)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-[var(--ink)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:bg-[var(--surface-muted)]"}`}>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-extrabold text-[var(--ink)]">{option.label}</span>
                                  <span className="block text-xs font-semibold text-[var(--muted-strong)]">
                                    {billingIntervalLabels[option.subscription.billingInterval]} · próximo cobro: {formatMediumDate(option.subscription.nextDueDate)}
                                    {count > 0 && ` · ${count} ${count === 1 ? "pago registrado" : "pagos registrados"}`}
                                  </span>
                                  {last && (
                                    <span className="mt-1 block text-xs font-extrabold text-[var(--ink)]">
                                      Último pago: {formatAmount(Math.round(last.amount * 100))} el {formatShortDateWithYear(last.paidAt.slice(0, 10))} · cubre {coverageLabel(last.periods, option.subscription.billingInterval)}
                                    </span>
                                  )}
                                </span>
                                <span className="shrink-0 text-right text-xs font-bold text-[var(--muted-strong)]">
                                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">Precio</span>
                                  <span className="tabular-nums">{formatAmount(Math.round(option.subscription.amount * 100))}/{option.subscription.billingInterval === "monthly" ? "mes" : "año"}</span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </fieldset>
                )}
              </>
            )}

            {editingLinked && selectedSubscription && (
              <p className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-xs font-bold text-[var(--muted-strong)]">
                Enlazado a un servicio de Clientes: {formatAmount(Math.round(selectedSubscription.amount * 100))} {billingIntervalLabels[selectedSubscription.billingInterval].toLowerCase()}. El monto y la fecha salen de cada pago registrado.
              </p>
            )}

            {(!isLinked || draft.subscriptionId) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={`block ${isLinked ? "sm:col-span-2" : ""}`}>
                  <span className={labelClass}>Nombre *</span>
                  <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} maxLength={80} placeholder="Alquiler" className={inputClass} autoFocus={!isLinked} />
                </label>
                {!isLinked && (
                  <>
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
                        <span className={labelClass}>{draft.frequency === "yearly" ? "Primer cobro en" : "Empieza en"}</span>
                        <input type="month" value={draft.startMonth} onChange={(event) => setDraft({ ...draft, startMonth: event.target.value })} className={inputClass} />
                      </label>
                    )}
                  </>
                )}
              </div>
            )}

            {!isLinked && editing === "new" && (
              <fieldset>
                <legend className={labelClass}>Se repite</legend>
                <div className="flex flex-wrap gap-2">
                  {([{ id: "monthly", label: "Cada mes" }, { id: "yearly", label: "Cada año" }] as const).map((option) => (
                    <button key={option.id} type="button" onClick={() => setDraft({ ...draft, frequency: option.id })} aria-pressed={draft.frequency === option.id} className={chipClass(draft.frequency === option.id)}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {draft.frequency === "yearly" && /^\d{4}-\d{2}$/.test(draft.startMonth) && (
                  <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
                    Se anota una vez al año, el día {draft.day || "?"} de {formatMonthName(draft.startMonth)}, desde {formatMonth(draft.startMonth)}.
                  </p>
                )}
              </fieldset>
            )}

            {(!isLinked || draft.subscriptionId) && (
              <fieldset>
                <legend className={labelClass}>Categoría *</legend>
                <div className="flex flex-wrap gap-2">
                  {options.map((category) => (
                    <button key={category.id} type="button" onClick={() => setDraft({ ...draft, categoryId: category.id })} aria-pressed={draft.categoryId === category.id} className={chipClass(draft.categoryId === category.id)}>
                      <CategoryDot color={category.color} />
                      {category.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {preview && <EntryPreview entries={preview.entries} category={lookup.get(draft.categoryId)} next={preview.next} />}
            {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={close} disabled={submitting} className={secondaryButtonClass}>Cancelar</button>
              <button type="submit" disabled={submitting || (isLinked && !draft.subscriptionId)} className={primaryButtonClass}>
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

const MAX_PREVIEW_ROWS = 6;

/** Previsualizacion de los movimientos que se anotan al crear el fijo. */
function EntryPreview({ entries, category, next }: { entries: PendingEntry[]; category?: FinanceCategory; next: string }) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const kind = entries[0]?.kind;
  const sign = kind === "income" ? "+" : "−";
  const tone = kind === "income" ? "text-[var(--success-text)]" : "text-[var(--danger-text)]";
  return (
    <section aria-label="Lo que se va a anotar" className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted-strong)]">
        {entries.length === 0 ? "Al crearlo no se anota nada todavía" : entries.length === 1 ? "Al crearlo se anota" : `Al crearlo se anotan ${entries.length} movimientos`}
      </p>
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.slice(0, MAX_PREVIEW_ROWS).map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface)] px-3 py-2.5">
              <CategoryDot color={category?.color ?? UNCATEGORIZED_COLOR} className="size-3" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[var(--ink)]">{entry.note || category?.name || "Sin nombre"}</span>
                <span className="block text-xs font-semibold text-[var(--muted)]">{formatShortDateWithYear(entry.date)} · {category?.name ?? "Sin categoría"}</span>
              </span>
              <span className={`shrink-0 text-lg font-extrabold tabular-nums ${tone}`}>{sign}{formatAmount(entry.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {entries.length > MAX_PREVIEW_ROWS && (
        <p className="mt-2 text-xs font-bold text-[var(--muted-strong)]">y {entries.length - MAX_PREVIEW_ROWS} más…</p>
      )}
      {entries.length > 1 && (
        <p className="mt-3 flex justify-between border-t border-[var(--line)] pt-3 text-sm font-extrabold text-[var(--ink)]">
          <span>Total</span>
          <span className={`tabular-nums ${tone}`}>{sign}{formatAmount(total)}</span>
        </p>
      )}
      <p className="mt-3 text-xs font-semibold leading-5 text-[var(--muted-strong)]">{next}</p>
    </section>
  );
}
