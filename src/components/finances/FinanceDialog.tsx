import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export const inputClass = "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35";
export const labelClass = "mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]";
export const primaryButtonClass = "flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--paper)] shadow-[0_8px_20px_rgba(23,25,23,0.2)] transition hover:bg-[var(--ink-hover)] disabled:opacity-60";
export const secondaryButtonClass = "flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60";

interface FinanceDialogProps {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
}

// Mismo marco que los formularios de clientes: modal centrado con cabecera fija.
export function FinanceDialog({ title, eyebrow, onClose, children, size = "md" }: FinanceDialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171917]/55 p-3 backdrop-blur-[3px] sm:p-6" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title" className={`mx-auto my-3 w-full rounded-[26px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:my-8 ${size === "lg" ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[26px] border-b border-[var(--line)] bg-[var(--surface)]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">{eyebrow}</p>
            <h2 id="finance-dialog-title" className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]">
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function KindToggle({ value, onChange }: { value: "expense" | "income"; onChange: (kind: "expense" | "income") => void }) {
  const options = [
    { id: "expense" as const, label: "Gasto" },
    { id: "income" as const, label: "Ingreso" },
  ];
  return (
    <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--surface-muted)] p-1">
      {options.map((option) => {
        const selected = value === option.id;
        const tone = option.id === "expense" ? "bg-[var(--danger-soft)] text-[var(--danger-text)]" : "bg-[var(--success-soft)] text-[var(--success-text)]";
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={`min-h-10 rounded-xl text-sm font-extrabold transition ${selected ? `${tone} shadow-sm` : "text-[var(--muted-strong)] hover:text-[var(--ink)]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CategoryDot({ color, className = "size-2.5" }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: color }} />;
}
