import { Settings2 } from "lucide-react";
import { getCredentialGroupAppearance } from "@/config/credential-groups";
import type { CredentialGroupDefinition } from "@/types/credential";

interface CredentialGroupFilterProps {
  groups: CredentialGroupDefinition[];
  value: string | null;
  onChange: (group: string | null) => void;
  onManage: () => void;
}

export function CredentialGroupFilter({ groups, value, onChange, onManage }: CredentialGroupFilterProps) {
  if (groups.length === 0) return null;

  return (
    <nav aria-label="Filtrar cuentas por grupo o proyecto" className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={`min-h-9 cursor-pointer rounded-full border px-3.5 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9f568]/45 ${
            value === null
              ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] shadow-[0_5px_14px_rgba(23,25,23,0.18)]"
              : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]"
          }`}
        >
          Todas
        </button>

        {groups.map((group) => {
          const selected = value === group.name;
          const appearance = getCredentialGroupAppearance(group.name, group.color);
          return (
            <button
              key={group.name}
              type="button"
              onClick={() => onChange(group.name)}
              aria-pressed={selected}
              style={appearance ? {
                backgroundColor: selected ? appearance.accent : appearance.soft,
                borderColor: selected ? appearance.accent : appearance.border,
                color: selected ? appearance.activeForeground : appearance.foreground,
              } : undefined}
              className={`min-h-9 cursor-pointer rounded-full border px-3.5 text-xs font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--line-strong)]/35 ${
                appearance
                  ? selected ? "shadow-[0_4px_12px_rgba(23,25,23,0.10)]" : "hover:brightness-[0.97]"
                  : selected
                    ? "border-[var(--line-strong)] bg-[var(--surface-muted)] text-[var(--ink)] shadow-[0_4px_12px_rgba(23,25,23,0.08)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              {group.name}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onManage}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs font-extrabold text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
        >
          <Settings2 aria-hidden="true" className="size-3.5" />
          Gestionar
        </button>
      </div>
    </nav>
  );
}
