import { Search, X } from "lucide-react";

interface ClientSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

export function ClientSearch({ value, onChange, resultCount }: ClientSearchProps) {
  return (
    <section aria-label="Buscar clientes">
      <label className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 transition focus-within:border-[var(--line-strong)] focus-within:ring-4 focus-within:ring-[#c9f568]/35">
        <Search aria-hidden="true" className="size-5 shrink-0 text-[var(--ink)]" />
        <input
          type="text"
          role="searchbox"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Busca por cliente, negocio o servicio"
          className="min-w-0 flex-1 bg-transparent text-base font-bold text-[var(--ink)] outline-none placeholder:font-medium placeholder:text-[var(--muted)]"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label="Limpiar búsqueda" className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </label>
      {value && <p className="px-2 pt-2 text-xs font-bold text-[var(--muted)]">{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</p>}
    </section>
  );
}
