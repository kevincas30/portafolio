import { Globe2 } from "lucide-react";
import type { Client } from "@/types/client";

/** Logo del cliente sacado de su web; si no hay, el icono generico. */
export function ClientLogo({ client }: { client: Pick<Client, "logo" | "businessName" | "clientName"> }) {
  if (client.logo) {
    return (
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--line-soft)] bg-white">
        <img src={client.logo} alt={`Logo de ${client.businessName || client.clientName}`} className="size-full object-contain p-1" />
      </span>
    );
  }
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
      <Globe2 aria-hidden="true" className="size-5" />
    </span>
  );
}
