import { ArrowDownRight, ArrowUpRight, Bug, Scale, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatAmount } from "@/lib/finance/money";
import { change, type MonthSummary } from "@/lib/finance/summary";

interface MonthStatsProps {
  summary: MonthSummary;
  previous: MonthSummary;
  antThreshold: number;
  fixedExpense: number;
}

const percent = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 0 });

/** Flecha de variacion. `upIsGood` invierte los colores (gastar mas es malo, ingresar mas es bueno). */
function Delta({ current, previous, upIsGood }: { current: number; previous: number; upIsGood: boolean }) {
  const ratio = change(current, previous);
  if (ratio === null || Math.abs(ratio) < 0.005) return <span className="text-xs font-bold text-[var(--muted)]">Sin comparación</span>;
  const up = ratio > 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold ${good ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {percent.format(Math.abs(ratio))} <span className="font-bold text-[var(--muted)]">vs. mes anterior</span>
    </span>
  );
}

function Stat({ icon: Icon, label, value, tone, children }: { icon: LucideIcon; label: string; value: string; tone: string; children?: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-[var(--line-soft)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_rgba(23,25,23,0.05)] sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="size-4" /></span>
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted-strong)]">{label}</p>
      </div>
      <p className="text-[clamp(1.25rem,4vw,1.75rem)] font-extrabold tracking-[-0.03em] text-[var(--ink)] tabular-nums">{value}</p>
      <div className="mt-1.5 min-h-4">{children}</div>
    </div>
  );
}

export function MonthStats({ summary, previous, antThreshold, fixedExpense }: MonthStatsProps) {
  const antShare = summary.expense ? summary.ant.total / summary.expense : 0;
  return (
    <section aria-label="Resumen del mes" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Ingresos" value={formatAmount(summary.income)} tone="bg-[var(--success-soft)] text-[var(--success-text)]">
          <Delta current={summary.income} previous={previous.income} upIsGood />
        </Stat>
        <Stat icon={TrendingDown} label="Gastos" value={formatAmount(summary.expense)} tone="bg-[var(--danger-soft)] text-[var(--danger-text)]">
          <Delta current={summary.expense} previous={previous.expense} upIsGood={false} />
        </Stat>
        <Stat icon={Scale} label="Balance" value={formatAmount(summary.balance)} tone="bg-[var(--accent-soft)] text-[var(--accent-text-strong)]">
          <span className={`text-xs font-extrabold ${summary.balance >= 0 ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"}`}>
            {summary.balance >= 0 ? "Ahorraste este mes" : "Gastaste más de lo que entró"}
          </span>
        </Stat>
        <Stat icon={Bug} label="Hormiga" value={formatAmount(summary.ant.total)} tone="bg-[var(--charge-soft)] text-[var(--charge-text)]">
          <span className="text-xs font-bold text-[var(--muted-strong)]">
            {summary.ant.count} {summary.ant.count === 1 ? "gasto chico" : "gastos chicos"} (hasta {formatAmount(antThreshold)}) en caprichos
            {summary.expense > 0 && ` · ${percent.format(antShare)} del total`}
          </span>
        </Stat>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs font-bold text-[var(--muted-strong)]">
        <span>Media diaria: <span className="text-[var(--ink)]">{formatAmount(summary.dailyAverage)}</span></span>
        {summary.projectedExpense !== null && (
          <span>A este ritmo cierras el mes en <span className="text-[var(--ink)]">{formatAmount(summary.projectedExpense)}</span></span>
        )}
        {fixedExpense > 0 && <span>Gastos fijos: <span className="text-[var(--ink)]">{formatAmount(fixedExpense)}/mes</span></span>}
      </p>
    </section>
  );
}
