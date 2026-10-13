import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Eye, EyeOff, LoaderCircle, Plus, ShieldCheck, Star, X } from "lucide-react";
import { GoogleCredentialSelector } from "@/components/passwords/GoogleCredentialSelector";
import { LoginMethodField } from "@/components/passwords/LoginMethodField";
import { GMAIL_INBOX_URL, inferCredentialProvider, isSocialCredential, isWebsitePlatform } from "@/config/credential-platforms";
import type { Credential, CredentialDraft, LoginMethod } from "@/types/credential";

const inputClass = "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] outline-none transition placeholder:font-medium placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35";
const labelClass = "mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]";

function capitalizeInitial(value: string): string {
  const firstCharacter = value.search(/\S/);
  if (firstCharacter < 0) return value;
  return `${value.slice(0, firstCharacter)}${value[firstCharacter].toLocaleUpperCase("es")}${value.slice(firstCharacter + 1)}`;
}

interface SecretInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SecretInput({ value, onChange, placeholder }: SecretInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}

function draftFromCredential(credential?: Credential): CredentialDraft {
  return {
    name: credential?.name ?? "",
    platform: credential?.platform ?? "",
    category: credential?.category ?? "",
    groupName: credential?.groupName ?? "",
    url: credential && (credential.provider === "google" || inferCredentialProvider(credential.platform, credential.url) === "google")
      ? GMAIL_INBOX_URL
      : credential?.url ?? "",
    provider: credential?.provider ?? null,
    loginMethod: credential?.loginMethod ?? "password",
    email: credential?.email ?? "",
    username: credential?.username ?? "",
    password: "",
    loginCredentialId: credential?.loginCredentialId ?? null,
    emailCredentialId: credential?.emailCredentialId ?? null,
    accessInstructions: credential?.accessInstructions ?? "",
    notes: credential?.notes ?? "",
    favorite: credential?.favorite ?? false,
  };
}

interface CredentialFormProps {
  credential?: Credential;
  googleCredentials: Credential[];
  groupNames: string[];
  onSave: (draft: CredentialDraft) => Promise<void>;
  onCreateGoogle: (email: string, password: string, groupName: string) => Promise<Credential>;
  onCreateGroup: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
}

export function CredentialForm({ credential, googleCredentials, groupNames, onSave, onCreateGoogle, onCreateGroup, onCancel }: CredentialFormProps) {
  const [draft, setDraft] = useState(() => draftFromCredential(credential));
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [notesOpen, setNotesOpen] = useState(Boolean(credential?.notes));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [addingGoogle, setAddingGoogle] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googlePassword, setGooglePassword] = useState("");
  const [creatingGoogle, setCreatingGoogle] = useState(false);
  const [duplicateGoogle, setDuplicateGoogle] = useState<Credential | null>(null);
  const [newGroupColor, setNewGroupColor] = useState("#7C6CE7");
  const googleProviderDetected = inferCredentialProvider(draft.platform, draft.url) === "google";
  const isGoogleProvider = draft.provider === "google";
  const showGoogleProviderOption = googleProviderDetected || isGoogleProvider;
  const showUsername = isSocialCredential(draft.name, draft.platform, draft.url);
  const isWebsite = draft.loginMethod === "website";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting && !creatingGoogle) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [creatingGoogle, onCancel, submitting]);

  const setField = <Key extends keyof CredentialDraft>(key: Key, value: CredentialDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setCapitalizedField = (
    key: "name" | "groupName" | "accessInstructions" | "notes",
    value: string,
  ) => {
    setField(key, capitalizeInitial(value));
  };

  const changeMethod = (method: LoginMethod) => {
    setDraft((current) => ({ ...current, loginMethod: method }));
  };

  const changePlatform = (platform: string) => {
    const normalizedPlatform = capitalizeInitial(platform);
    setDraft((current) => {
      const previousWasDetected = inferCredentialProvider(current.platform, current.url) === "google";
      const detectedProvider = inferCredentialProvider(normalizedPlatform, current.url);
      return {
        ...current,
        platform: normalizedPlatform,
        loginMethod: isWebsitePlatform(normalizedPlatform)
          ? "website"
          : current.loginMethod === "website" ? "password" : current.loginMethod,
        provider: previousWasDetected && !detectedProvider ? null : current.provider,
      };
    });
  };

  const changeUrl = (url: string) => {
    setDraft((current) => {
      const previousWasDetected = inferCredentialProvider(current.platform, current.url) === "google";
      const detectedProvider = inferCredentialProvider(current.platform, url);
      return {
        ...current,
        url,
        provider: previousWasDetected && !detectedProvider ? null : current.provider,
      };
    });
  };

  const selectGoogleCredential = (selected: Credential) => {
    setDraft((current) => ({
      ...current,
      loginCredentialId: current.loginMethod === "google" ? selected.id : current.loginCredentialId,
      emailCredentialId: current.loginMethod === "email_code" || current.loginMethod === "magic_link"
        ? selected.id
        : current.emailCredentialId,
    }));
    setGoogleEmail("");
    setGooglePassword("");
    setDuplicateGoogle(null);
    setAddingGoogle(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!draft.name.trim()) return setError("El nombre es obligatorio.");
    if (draft.loginMethod === "website" && !draft.url.trim()) {
      return setError("Añade el enlace de la página web.");
    }
    if (draft.loginMethod === "google" && !draft.loginCredentialId) {
      return setError("Selecciona la cuenta Google utilizada para acceder.");
    }
    if ((draft.loginMethod === "email_code" || draft.loginMethod === "magic_link") && !draft.email.trim()) {
      return setError("Indica el correo que recibe el acceso.");
    }
    if (draft.loginMethod === "password" && !draft.password && !credential?.encryptedPassword) {
      return setError("Indica la contraseña de esta cuenta.");
    }
    if (draft.loginMethod === "other" && !draft.accessInstructions.trim()) {
      return setError("Describe cómo se inicia sesión en esta cuenta.");
    }

    setSubmitting(true);
    try {
      if (creatingGroup && draft.groupName.trim()) {
        await onCreateGroup(draft.groupName.trim(), newGroupColor);
      }
      await onSave(draft.provider === "google" ? { ...draft, url: GMAIL_INBOX_URL } : draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la cuenta.");
    } finally {
      setSubmitting(false);
    }
  };

  const createGoogle = async () => {
    setError("");
    setDuplicateGoogle(null);
    if (!googleEmail.trim() || !googlePassword) {
      setError("Añade el correo y la contraseña de la cuenta Google.");
      return;
    }

    const existingGoogle = googleCredentials.find((item) =>
      item.email.trim().toLocaleLowerCase("es") === googleEmail.trim().toLocaleLowerCase("es"));
    if (existingGoogle) {
      setDuplicateGoogle(existingGoogle);
      return;
    }

    setCreatingGoogle(true);
    try {
      const created = await onCreateGoogle(googleEmail.trim(), googlePassword, draft.groupName.trim());
      selectGoogleCredential(created);
    } catch (reason) {
      const duplicate = reason && typeof reason === "object" && "existingCredential" in reason
        ? (reason as { existingCredential?: Credential }).existingCredential
        : undefined;
      if (duplicate) {
        setDuplicateGoogle(duplicate);
      } else {
        setError(reason instanceof Error ? reason.message : "No se pudo crear la cuenta Google.");
      }
    } finally {
      setCreatingGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171917]/55 p-3 backdrop-blur-[3px] sm:p-6" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="credential-form-title" className="mx-auto my-3 w-full max-w-3xl rounded-[26px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_28px_90px_rgba(23,25,23,0.3)] sm:my-8">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[26px] border-b border-[var(--line)] bg-[var(--surface)]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">Gestor de accesos</p>
            <h2 id="credential-form-title" className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">{credential ? `Editar ${credential.name}` : "Nueva cuenta"}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)]">
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Nombre *</span>
              <input value={draft.name} onChange={(event) => setCapitalizedField("name", event.target.value)} placeholder="Hostinger" className={inputClass} autoFocus />
            </label>
            <label className="block">
              <span className={labelClass}>Plataforma</span>
              <input value={draft.platform} onChange={(event) => changePlatform(event.target.value)} placeholder="Hostinger" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Grupo / Proyecto</span>
              {creatingGroup ? (
                <span className="block space-y-2">
                  <span className="flex gap-2">
                    <input
                      value={draft.groupName}
                      onChange={(event) => setCapitalizedField("groupName", event.target.value)}
                      placeholder="Nombre del nuevo grupo"
                      className={inputClass}
                      autoFocus
                    />
                    <label className="relative grid size-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]" title="Elegir color">
                      <span className="size-6 rounded-full" style={{ backgroundColor: newGroupColor }} />
                      <input type="color" value={newGroupColor} onChange={(event) => setNewGroupColor(event.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Color del nuevo grupo" />
                    </label>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingGroup(false);
                      setField("groupName", "");
                    }}
                    className="cursor-pointer text-xs font-bold text-[var(--ink)] transition hover:text-[var(--ink-hover)]"
                  >
                    Elegir un grupo existente
                  </button>
                </span>
              ) : (
                <span className="relative block">
                  <select
                    value={draft.groupName}
                    style={{ fontWeight: draft.groupName ? 400 : 500 }}
                    onChange={(event) => {
                      if (event.target.value === "__create_group__") {
                        setField("groupName", "");
                        setCreatingGroup(true);
                        return;
                      }
                      setField("groupName", event.target.value);
                    }}
                    className={`min-h-12 w-full cursor-pointer appearance-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-4 pr-12 text-sm font-bold outline-none transition focus:border-[var(--line-strong)] focus:ring-3 focus:ring-[#c9f568]/35 ${draft.groupName ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
                  >
                    <option value="" className="text-[var(--ink)]">Sin grupo</option>
                    {groupNames.map((groupName) => <option key={groupName} value={groupName} className="text-[var(--ink)]">{groupName}</option>)}
                    <option value="__create_group__" className="text-[var(--ink)]">+ Crear nuevo grupo…</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                </span>
              )}
            </label>
            <label className="block">
              <span className={labelClass}>{isWebsite ? "Enlace *" : "URL"}</span>
              <input type="url" value={draft.url} onChange={(event) => changeUrl(event.target.value)} placeholder="https://…" className={inputClass} />
            </label>
          </div>

          {!isWebsite && <LoginMethodField value={draft.loginMethod} onChange={changeMethod} />}

          {isWebsite && (
            <p className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--accent-text-strong)]">
              Esta entrada es una página web. Solo necesitas añadir su enlace; no requiere correo ni contraseña.
            </p>
          )}

          {draft.loginMethod === "password" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={showUsername ? "block" : "block sm:col-span-2"}>
                <span className={labelClass}>Email</span>
                <input type="email" value={draft.email} onChange={(event) => setField("email", event.target.value)} autoComplete="off" className={inputClass} />
              </label>
              {showUsername && (
                <label className="block">
                  <span className={labelClass}>Usuario</span>
                  <input value={draft.username} onChange={(event) => setField("username", event.target.value)} autoComplete="off" className={inputClass} />
                </label>
              )}
              <label className="block sm:col-span-2">
                <span className={labelClass}>Contraseña {credential ? <span className="normal-case tracking-normal text-[var(--ink)]">(vacía para conservar la actual)</span> : "*"}</span>
                <SecretInput value={draft.password} onChange={(value) => setField("password", value)} />
              </label>
              {showGoogleProviderOption && (
                <div className="sm:col-span-2 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[#edf4ff] px-4">
                  <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-[#4285f4]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-[#1f2937]">Usar como cuenta Google / Gmail</span>
                    <span className="block text-xs font-semibold text-[#1f2937]">
                      {isGoogleProvider
                        ? "Activada para utilizarla en “Continuar con Google”."
                        : "La plataforma parece ser Google. Actívala solo si quieres reutilizarla."}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isGoogleProvider}
                    aria-label={isGoogleProvider ? "Desactivar como cuenta Google" : "Activar como cuenta Google"}
                    onClick={() => setField("provider", isGoogleProvider ? null : "google")}
                    className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border border-[#9ca3af] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#4285f4]/20 ${isGoogleProvider ? "bg-[#69c98b]" : "bg-[#d1d5db]"}`}
                  >
                    <span className={`absolute left-0 top-0.5 size-[22px] rounded-full bg-white shadow-[0_2px_6px_rgba(23,25,23,0.22)] transition-transform ${isGoogleProvider ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                  </button>
                </div>
              )}
            </div>
          )}

          {draft.loginMethod === "google" && (
            <GoogleCredentialSelector
              credentials={googleCredentials}
              value={draft.loginCredentialId}
              onChange={(id) => setField("loginCredentialId", id)}
              onAdd={() => setAddingGoogle(true)}
            />
          )}

          {(draft.loginMethod === "email_code" || draft.loginMethod === "magic_link") && (
            <div className="space-y-5">
              <label className="block">
                <span className={labelClass}>{draft.loginMethod === "email_code" ? "Email que recibe el código *" : "Email que recibe el enlace *"}</span>
                <input type="email" value={draft.email} onChange={(event) => setField("email", event.target.value)} autoComplete="off" className={inputClass} />
              </label>
              <GoogleCredentialSelector
                credentials={googleCredentials}
                value={draft.emailCredentialId}
                onChange={(id) => setField("emailCredentialId", id)}
                optional
                onAdd={() => setAddingGoogle(true)}
              />
            </div>
          )}

          {addingGoogle && (
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-muted)] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-[var(--ink)]">Crear nueva cuenta Google</h3>
                  <p className="mt-0.5 text-xs font-semibold text-[var(--ink)]">Se guardará como una cuenta independiente.</p>
                </div>
                <button type="button" onClick={() => setAddingGoogle(false)} aria-label="Cerrar alta de Google" className="grid size-9 place-items-center rounded-full text-[var(--muted-strong)] hover:bg-[var(--surface)]"><X aria-hidden="true" className="size-4" /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="email" value={googleEmail} onChange={(event) => { setGoogleEmail(event.target.value); setDuplicateGoogle(null); }} placeholder="Correo Google" autoComplete="off" className={inputClass} />
                <SecretInput value={googlePassword} onChange={setGooglePassword} placeholder="Contraseña de Google" />
              </div>
              {duplicateGoogle && (
                <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
                  <p className="text-sm font-extrabold text-[var(--ink)]">Esta cuenta Google ya está guardada.</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[var(--muted)]">{duplicateGoogle.email} · {duplicateGoogle.name}</p>
                  <button type="button" onClick={() => selectGoogleCredential(duplicateGoogle)} className="mt-2 min-h-10 cursor-pointer rounded-xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--paper)] hover:bg-[var(--ink-hover)]">
                    Usar esta cuenta
                  </button>
                </div>
              )}
              {!duplicateGoogle && (
                <button type="button" onClick={createGoogle} disabled={creatingGoogle} className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--paper)] disabled:opacity-60">
                  {creatingGoogle ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
                  Guardar y usar esta cuenta
                </button>
              )}
            </div>
          )}

          {draft.loginMethod === "other" && (
            <label className="block">
              <span className={labelClass}>Descripción manual *</span>
              <textarea value={draft.accessInstructions} onChange={(event) => setCapitalizedField("accessInstructions", event.target.value)} rows={4} placeholder="Explica cómo iniciar sesión…" className={`${inputClass} resize-y py-3`} />
            </label>
          )}

          <div className="space-y-3">
            {notesOpen && (
              <label className="block">
                <span className={labelClass}>Notas</span>
                <textarea value={draft.notes} onChange={(event) => setCapitalizedField("notes", event.target.value)} rows={3} placeholder="Información útil para encontrar o usar esta cuenta…" className={`${inputClass} resize-y py-3`} />
              </label>
            )}

            <div className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2">
              <button type="button" onClick={() => setNotesOpen((current) => !current)} className="inline-flex min-h-9 w-fit cursor-pointer items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--ink)]">
                {notesOpen ? <EyeOff aria-hidden="true" className="size-5" /> : <Plus aria-hidden="true" className="size-5" />}
                {notesOpen ? "Ocultar nota" : "Agregar nota"}
              </button>

              <button type="button" onClick={() => setField("favorite", !draft.favorite)} className={`inline-flex min-h-9 w-fit cursor-pointer items-center gap-2 text-sm font-bold transition ${draft.favorite ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
                <Star aria-hidden="true" className="size-5" fill={draft.favorite ? "currentColor" : "none"} />
                {draft.favorite ? "Cuenta favorita" : "Marcar como favorita"}
              </button>
            </div>
          </div>

          {error && <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5">
            <button type="button" onClick={onCancel} disabled={submitting} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">Cancelar</button>
            <button type="submit" disabled={submitting} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--paper)] shadow-[0_8px_20px_rgba(23,25,23,0.2)] transition hover:bg-[var(--ink-hover)] disabled:opacity-60">
              {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {credential ? "Guardar cambios" : "Crear cuenta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
