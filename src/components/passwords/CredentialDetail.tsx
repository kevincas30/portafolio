import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe2,
  KeyRound,
  Link2,
  Mail,
  Pencil,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { CopyButton } from "@/components/passwords/CopyButton";
import { PasswordField } from "@/components/passwords/PasswordField";
import { PlatformLogo } from "@/components/passwords/PlatformLogo";
import { getCredentialGroupAppearance } from "@/config/credential-groups";
import { GMAIL_INBOX_URL, inferCredentialProvider } from "@/config/credential-platforms";
import type { Credential, LoginMethod } from "@/types/credential";

const methodContent: Record<LoginMethod, { label: string; description: string; icon: typeof KeyRound }> = {
  password: {
    label: "Acceso con contraseña",
    description: "Usa este correo o usuario y esta contraseña para iniciar sesión.",
    icon: KeyRound,
  },
  google: {
    label: "Acceso con Gmail",
    description: "Esta cuenta se abre usando la cuenta de Gmail indicada abajo.",
    icon: ShieldCheck,
  },
  email_code: {
    label: "Acceso con código",
    description: "Esta cuenta envía un código al correo indicado para poder entrar.",
    icon: Mail,
  },
  magic_link: {
    label: "Acceso con magic link",
    description: "Esta cuenta envía un enlace al correo indicado para poder entrar.",
    icon: Link2,
  },
  other: {
    label: "Otro método de acceso",
    description: "Sigue las instrucciones guardadas para acceder a esta cuenta.",
    icon: KeyRound,
  },
  website: {
    label: "Página web",
    description: "Esta es una página web. No necesitas datos de acceso; pulsa el botón de abajo para visitarla.",
    icon: Globe2,
  },
};

interface DetailValueProps {
  label: string;
  value: string;
  copyMessage: string;
  onToast: (message: string) => void;
}

function DetailValue({ label, value, copyMessage, onToast }: DetailValueProps) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3.5 py-3 sm:px-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 break-all text-sm font-bold text-[var(--ink)]">{value}</p>
        <CopyButton getValue={() => value} message={copyMessage} onToast={onToast} />
      </div>
    </div>
  );
}

interface DetailPasswordProps {
  label: string;
  credential: Credential;
  vaultKey: CryptoKey | null;
  onToast: (message: string) => void;
}

function DetailPassword({ label, credential, vaultKey, onToast }: DetailPasswordProps) {
  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3.5 py-3 sm:px-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      <div className="mt-0.5">
        <PasswordField
          key={`${credential.id}-${credential.updatedAt}`}
          encryptedPassword={credential.encryptedPassword}
          passwordIv={credential.passwordIv}
          vaultKey={vaultKey}
          label={label}
          onToast={onToast}
          fullWidth
        />
      </div>
    </div>
  );
}

function relationDescription(credential: Credential, googleId: string): string {
  if (credential.loginCredentialId === googleId) {
    return credential.loginMethod === "google"
      ? "Usa este Gmail para iniciar sesión"
      : "Usa esta cuenta para iniciar sesión";
  }
  if (credential.emailCredentialId === googleId) {
    if (credential.loginMethod === "email_code") return "Recibe aquí sus códigos de acceso";
    if (credential.loginMethod === "magic_link") return "Recibe aquí sus enlaces de acceso";
    return "Usa este Gmail como correo relacionado";
  }
  return "Cuenta vinculada";
}

interface CredentialDetailProps {
  credential: Credential;
  credentialMap: Map<string, Credential>;
  groupColor?: string;
  vaultKey: CryptoKey | null;
  onBack: () => void;
  onOpenCredential: (credentialId: string) => void;
  onEdit: (credential: Credential) => void;
  onDelete: (credential: Credential) => void;
  onToggleFavorite: (credential: Credential) => void;
  onToast: (message: string) => void;
}

export function CredentialDetail({
  credential,
  credentialMap,
  groupColor,
  vaultKey,
  onBack,
  onOpenCredential,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToast,
}: CredentialDetailProps) {
  const method = methodContent[credential.loginMethod];
  const MethodIcon = method.icon;
  const loginCredential = credential.loginCredentialId
    ? credentialMap.get(credential.loginCredentialId) ?? null
    : null;
  const emailCredential = credential.emailCredentialId
    ? credentialMap.get(credential.emailCredentialId) ?? null
    : null;
  const isGoogleProvider = credential.provider === "google";
  const openUrl = isGoogleProvider || inferCredentialProvider(credential.platform, credential.url) === "google"
    ? GMAIL_INBOX_URL
    : credential.url;
  const headerCategory = credential.groupName || credential.category;
  const groupAppearance = getCredentialGroupAppearance(headerCategory, groupColor);
  const relatedCredentials = isGoogleProvider
    ? Array.from(credentialMap.values()).filter((item) =>
        item.id !== credential.id && (
          item.loginCredentialId === credential.id || item.emailCredentialId === credential.id
        ))
    : [];
  const ownPassword = credential.loginMethod === "password" ? credential : null;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-3 sm:space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-extrabold text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Regresar
      </button>

      <article className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_12px_38px_rgba(23,25,23,0.06)]">
        <header className="border-b border-[var(--line-soft)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-[1_1_240px] items-center gap-3">
              <PlatformLogo name={credential.name} platform={credential.platform} url={credential.url} />
              <h1 className="min-w-0 break-words text-lg font-extrabold tracking-[-0.03em] text-[var(--ink)] sm:text-xl">
                {credential.name}
                <span className="font-semibold text-[var(--muted)]"> · {credential.platform || "Sin plataforma"}</span>
              </h1>
            </div>

            <div className="ml-auto flex max-w-full items-center gap-1.5">
              {headerCategory && (
                <span
                  style={groupAppearance ? {
                    backgroundColor: groupAppearance.soft,
                    borderColor: groupAppearance.border,
                    color: groupAppearance.foreground,
                  } : undefined}
                  className={`mr-1 max-w-36 truncate rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${groupAppearance ? "" : "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--muted-strong)]"}`}
                  title={headerCategory}
                >
                  {headerCategory}
                </span>
              )}
            <button
              type="button"
              onClick={() => onToggleFavorite(credential)}
              aria-label={credential.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
              title={credential.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
              className={`grid size-9 place-items-center rounded-full transition hover:bg-[var(--surface-muted)] ${credential.favorite ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
            >
              <Star aria-hidden="true" className="size-4" fill={credential.favorite ? "currentColor" : "none"} />
            </button>
            <button type="button" onClick={() => onEdit(credential)} aria-label={`Editar ${credential.name}`} title="Editar" className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
              <Pencil aria-hidden="true" className="size-4" />
            </button>
            <button type="button" onClick={() => onDelete(credential)} aria-label={`Eliminar ${credential.name}`} title="Eliminar" className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]">
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
          <section aria-labelledby="access-data-title">
            <h2 id="access-data-title" className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Datos de acceso</h2>
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3.5 sm:p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface)]/80 text-[var(--accent-text)]">
                <MethodIcon aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-[var(--accent-text-strong)]">{method.label}</p>
                <p className="mt-1 text-sm font-medium leading-5 text-[var(--accent-text-strong)]">{method.description}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {credential.loginMethod !== "google" && credential.loginMethod !== "website" && (
                <>
                  <DetailValue label="Correo" value={credential.email} copyMessage="Correo copiado" onToast={onToast} />
                  <DetailValue label="Usuario" value={credential.username} copyMessage="Usuario copiado" onToast={onToast} />
                  {ownPassword && <DetailPassword label="Contraseña" credential={ownPassword} vaultKey={vaultKey} onToast={onToast} />}
                </>
              )}

              {credential.loginMethod === "google" && loginCredential && (
                <>
                  <DetailValue label="Cuenta Gmail" value={loginCredential.email || loginCredential.username} copyMessage="Cuenta Gmail copiada" onToast={onToast} />
                  <DetailPassword label="Contraseña de Gmail" credential={loginCredential} vaultKey={vaultKey} onToast={onToast} />
                </>
              )}

              {credential.loginMethod === "google" && !loginCredential && (
                <p className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft-strong)] px-4 py-3 text-sm font-bold text-[var(--danger-text)]">Esta cuenta todavía no tiene una credencial Gmail relacionada.</p>
              )}

              {(credential.loginMethod === "email_code" || credential.loginMethod === "magic_link") && emailCredential && (
                <>
                <DetailValue label="Correo" value={emailCredential.email || emailCredential.username} copyMessage="Correo copiado" onToast={onToast} />
                <DetailPassword label="Contraseña del correo" credential={emailCredential} vaultKey={vaultKey} onToast={onToast} />
                </>
              )}
            </div>

            {openUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-extrabold text-[var(--paper)] transition hover:bg-[var(--ink-hover)] active:scale-[0.99]"
              >
                {credential.loginMethod === "website" ? "Ir a la web" : `Abrir ${credential.platform || credential.name}`}
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            )}
          </section>

          {(credential.accessInstructions || credential.notes) && (
            <section aria-labelledby="additional-info-title">
              <h2 id="additional-info-title" className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Información adicional</h2>
              <div className="mt-3 space-y-2 text-sm font-medium leading-6 text-[var(--muted-strong)]">
                {credential.accessInstructions && <p className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3">{credential.accessInstructions}</p>}
                {credential.notes && <p className="whitespace-pre-wrap rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3">{credential.notes}</p>}
              </div>
            </section>
          )}

          {isGoogleProvider && relatedCredentials.length > 0 && (
            <section aria-labelledby="related-accounts-title">
              <h2 id="related-accounts-title" className="text-base font-extrabold tracking-[-0.02em] text-[var(--ink)]">Cuentas vinculadas</h2>
              <p className="mt-1 text-sm font-medium text-[var(--muted)]">Estas cuentas utilizan este Gmail para iniciar sesión.</p>
              <ul className="mt-3 space-y-1">
                {relatedCredentials.map((related) => (
                  <li key={related.id} className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-2.5 transition hover:bg-[var(--surface-soft)] sm:px-2">
                    <PlatformLogo name={related.name} platform={related.platform} url={related.url} compact />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[var(--ink)]">{related.name}</p>
                      <p className="truncate text-xs font-semibold text-[var(--muted)]">{relationDescription(related, credential.id)}</p>
                    </div>
                    <button type="button" onClick={() => onOpenCredential(related.id)} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--accent-soft)]">
                      Ver cuenta
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </article>
    </div>
  );
}
