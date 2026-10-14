import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CopyButton } from "@/components/passwords/CopyButton";

interface PasswordFieldProps {
  /** Password ya descifrada en memoria (boveda por usuario). */
  password?: string;
  label?: string;
  onToast: (message: string) => void;
  fullWidth?: boolean;
}

export function PasswordField({
  password,
  label = "Contraseña",
  onToast,
  fullWidth = false,
}: PasswordFieldProps) {
  const [visiblePassword, setVisiblePassword] = useState<string | null>(null);
  const hasPassword = Boolean(password);

  const readPassword = async () => password ?? "";

  const toggleVisibility = async () => {
    if (visiblePassword !== null) {
      setVisiblePassword(null);
      return;
    }

    try {
      setVisiblePassword(await readPassword());
    } catch {
      onToast("No se pudo leer la contraseña");
    }
  };

  const isVisible = visiblePassword !== null;

  return (
    <div className={`flex min-h-8 w-full min-w-0 items-start gap-0.5 ${fullWidth ? "" : "sm:w-[280px] sm:flex-none"}`} title={label}>
      <span className="sr-only">{label}</span>
      <span className={`min-w-0 flex-1 py-2 text-xs font-bold leading-4 ${isVisible ? "break-all whitespace-normal" : "truncate whitespace-nowrap"} text-[var(--ink)]`}>
        {hasPassword ? visiblePassword ?? "••••••••••" : "Sin contraseña"}
      </span>
      <div className="flex shrink-0 items-start gap-0.5">
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={!hasPassword}
          aria-label={visiblePassword === null ? "Mostrar contraseña" : "Ocultar contraseña"}
          title={visiblePassword === null ? "Mostrar contraseña" : "Ocultar contraseña"}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] disabled:cursor-default disabled:opacity-35"
        >
          {visiblePassword === null ? <Eye aria-hidden="true" className="size-3.5" /> : <EyeOff aria-hidden="true" className="size-3.5" />}
        </button>
        <CopyButton
          getValue={readPassword}
          message="Contraseña copiada"
          onToast={onToast}
          disabled={!hasPassword}
        />
      </div>
    </div>
  );
}
