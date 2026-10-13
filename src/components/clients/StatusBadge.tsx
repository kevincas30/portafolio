import { statusStyles } from "@/lib/client-status";
import type { ClientStatus } from "@/types/client";

export function StatusBadge({ status, label }: { status: ClientStatus; label: string }) {
  const style = statusStyles[status];
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-[11px] font-extrabold"
      style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: style.dot }} />
      <span className="truncate">{label}</span>
    </span>
  );
}
