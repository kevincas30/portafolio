import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  getValue: () => string | Promise<string>;
  message: string;
  onToast: (message: string) => void;
  disabled?: boolean;
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CopyButton({ getValue, message, onToast, disabled }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleCopy = async () => {
    try {
      const value = await getValue();
      if (!value) return;
      await copyText(value);
      setCopied(true);
      onToast(message);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      onToast("No se pudo copiar");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      aria-label={message}
      title={message}
      className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] transition active:scale-95 ${
        copied
          ? "text-[var(--success-text)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {copied ? <Check aria-hidden="true" className="size-3.5" strokeWidth={2.8} /> : <Copy aria-hidden="true" className="size-3.5" />}
    </button>
  );
}
