import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { PanelStatus } from "@/hooks/usePanelSession";

interface PanelLoginProps {
  status: PanelStatus;
  error: string;
  onSetup: (password: string) => Promise<void>;
  onUnlock: (password: string) => Promise<void>;
}

export function PanelLogin({ status, error, onSetup, onUnlock }: PanelLoginProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const isSetup = status === "setup";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (password.length < 10) {
      setFormError("Usa una contraseña maestra de al menos 10 caracteres.");
      return;
    }
    if (isSetup && password !== confirmation) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSetup) await onSetup(password);
      else await onUnlock(password);
      setPassword("");
      setConfirmation("");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "No se pudo desbloquear el panel.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-[26px] border border-[var(--line-soft)] bg-[var(--surface)]">
        <div className="text-center text-[var(--ink)]">
          <LoaderCircle aria-hidden="true" className="mx-auto size-7 animate-spin text-[var(--ink)]" />
          <p className="mt-3 text-sm font-bold">Preparando el acceso privado…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return <p className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft-strong)] px-4 py-4 text-sm font-bold text-[var(--danger-text)]">{error}</p>;
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-[var(--line-soft)] bg-[var(--surface)] shadow-[0_14px_42px_rgba(23,25,23,0.08)]">
      <div className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#2e3127_0%,#171917_55%,#0e0f0c_100%)] px-5 py-7 text-white sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 -z-10 size-64 rounded-full border-[42px] border-[#c9f568]/10" />
        <div className="flex items-start justify-between gap-3">
          <BrandLogo className="[&_.brand-logo]:h-5 [&_.brand-logo--dark]:!block [&_.brand-logo--light]:!hidden" />
          <ThemeToggle className="!border-white/20 !text-white hover:!bg-white/15 hover:!text-white" />
        </div>
        <div className="mb-5 mt-5 grid size-12 place-items-center rounded-2xl border border-[#c9f568]/30 bg-[#c9f568]/15 backdrop-blur-sm">
          <LockKeyhole aria-hidden="true" className="size-6 text-[#c9f568]" />
        </div>
        <p className="mb-1 text-sm font-semibold text-white/75">Panel privado de clientes</p>
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          {isSetup ? "Crear contraseña maestra" : "Bienvenido de nuevo"}
        </h1>
      </div>

      <form onSubmit={submit} className="mx-auto max-w-xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex gap-3 rounded-2xl bg-[var(--surface-muted)] p-4 text-[var(--ink)]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--ink)]" />
          <p className="text-sm font-medium leading-6">
            {isSetup
              ? "Esta contraseña solo protege la entrada al panel. Guárdala en un lugar seguro: no se puede recuperar si la olvidas."
              : "Introduce tu contraseña maestra para entrar. Tendrás tus clientes y pagos a mano; las contraseñas guardadas se abren después con tu passkey."}
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Contraseña maestra</span>
          <span className="flex items-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 transition focus-within:border-[#c9f568] focus-within:ring-3 focus-within:ring-[#c9f568]/35">
            <KeyRound aria-hidden="true" className="size-5 shrink-0 text-[var(--muted)]" />
            <input
              type={visible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSetup ? "new-password" : "current-password"}
              className="min-h-13 min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-[var(--ink)] outline-none focus-visible:outline-none"
              autoFocus
            />
            <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ocultar" : "Mostrar"} className="grid size-10 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-muted)]">
              {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
            </button>
          </span>
        </label>

        {isSetup && (
          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Repetir contraseña</span>
            <input
              type={visible ? "text" : "password"}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              className="min-h-13 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] outline-none focus-visible:outline-none transition focus:border-[#c9f568] focus:ring-3 focus:ring-[#c9f568]/35"
            />
          </label>
        )}

        {(formError || error) && <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{formError || error}</p>}

        <button type="submit" disabled={submitting} className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-5 text-sm font-extrabold text-[var(--paper)] shadow-[0_8px_20px_rgba(23,25,23,0.2)] transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60">
          {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {isSetup ? "Crear contraseña y entrar" : "Entrar al panel"}
        </button>
      </form>
    </section>
  );
}
