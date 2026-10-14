// Reglas de credenciales que antes vivian en el servidor (dedupe Google, relaciones,
// nulificado de dependientes, grupos). Con el vault cifrado corren en el cliente sobre
// la lista ya descifrada. Funciones puras: sin DOM, sin red.
import type { GroupSetting } from "./blob";

export interface RuleCredential {
  id: string;
  loginMethod: string;
  provider: "google" | null;
  email: string;
  loginCredentialId: string | null;
  emailCredentialId: string | null;
  groupName: string;
}

export const DEFAULT_GROUP_COLOR = "#9CA3AF";

const lower = (value: string) => value.trim().toLocaleLowerCase("es");

/** Clave de dedupe: lower(trim(email)). Vacia = sin identidad Google que proteger. */
export function googleDedupeKey(email: string): string {
  return lower(email);
}

/** El proveedor solo aplica a login por password (igual que el servidor legacy). */
export function resolveProvider(loginMethod: string, provider: "google" | null | undefined): "google" | null {
  return loginMethod === "password" ? (provider ?? null) : null;
}

/** Otra credencial Google del mismo usuario con el mismo email (sin importar mayusculas/espacios). */
export function findDuplicateGoogle<T extends RuleCredential>(
  list: readonly T[],
  candidate: Pick<RuleCredential, "id" | "provider" | "email">,
): T | null {
  if (candidate.provider !== "google") return null;
  const key = googleDedupeKey(candidate.email);
  if (!key) return null;
  return (
    list.find(
      (item) => item.id !== candidate.id && item.provider === "google" && googleDedupeKey(item.email) === key,
    ) ?? null
  );
}

/** Devuelve un mensaje de error o null. Mismas reglas y textos que el servidor legacy. */
export function validateRelations(
  candidate: Pick<RuleCredential, "id" | "loginMethod" | "loginCredentialId" | "emailCredentialId">,
  list: readonly RuleCredential[],
): string | null {
  const relationIds = [candidate.loginCredentialId, candidate.emailCredentialId].filter(Boolean) as string[];
  if (relationIds.includes(candidate.id)) return "Una cuenta no puede relacionarse consigo misma.";
  if (candidate.loginMethod === "google" && !candidate.loginCredentialId) {
    return "Selecciona la cuenta Google utilizada para iniciar sesión.";
  }
  if (relationIds.length === 0) return null;

  const byId = new Map(list.map((item) => [item.id, item]));
  if (relationIds.some((id) => !byId.has(id))) return "La credencial relacionada no existe.";

  const compatible = (id: string | null) => {
    const target = id ? byId.get(id) : undefined;
    return Boolean(target && target.loginMethod === "password" && target.provider === "google");
  };
  if (candidate.loginCredentialId && !compatible(candidate.loginCredentialId)) {
    return "Selecciona una credencial Google o Gmail compatible.";
  }
  if (candidate.emailCredentialId && !compatible(candidate.emailCredentialId)) {
    return "Selecciona una credencial de correo Google o Gmail compatible.";
  }
  return null;
}

/** Credenciales que referencian a `id` (para avisar antes de borrar). */
export function findDependents<T extends RuleCredential>(list: readonly T[], id: string): T[] {
  return list.filter((item) => item.loginCredentialId === id || item.emailCredentialId === id);
}

/** Copias de los dependientes con la referencia a `deletedId` en null. Solo los que cambian. */
export function nullDependents<T extends RuleCredential>(list: readonly T[], deletedId: string): T[] {
  return findDependents(list, deletedId).map((item) => ({
    ...item,
    loginCredentialId: item.loginCredentialId === deletedId ? null : item.loginCredentialId,
    emailCredentialId: item.emailCredentialId === deletedId ? null : item.emailCredentialId,
  }));
}

export interface GroupView {
  name: string;
  color: string;
}

/**
 * Lista de grupos visibles = ajustes no ocultos (ordenados) + grupos usados en credenciales
 * que no tengan ajuste. Mismo criterio que GET credential-groups legacy.
 */
export function deriveGroups(settings: readonly GroupSetting[], list: readonly RuleCredential[]): GroupView[] {
  const settingByName = new Map(settings.map((s) => [lower(s.name), s]));
  const sorted = [...settings].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
  const groups: GroupView[] = sorted.filter((s) => !s.hidden).map((s) => ({ name: s.name, color: s.color }));

  const used = new Map<string, string>();
  list.forEach((item) => {
    const name = item.groupName.trim();
    if (name && !used.has(lower(name))) used.set(lower(name), name);
  });
  [...used.values()]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .forEach((name) => {
      if (!settingByName.has(lower(name)) && !groups.some((g) => lower(g.name) === lower(name))) {
        groups.push({ name, color: DEFAULT_GROUP_COLOR });
      }
    });
  return groups;
}

function upsertSetting(settings: GroupSetting[], name: string, patch: Partial<GroupSetting>): GroupSetting[] {
  const index = settings.findIndex((s) => lower(s.name) === lower(name));
  if (index === -1) {
    return [
      ...settings,
      { name, color: DEFAULT_GROUP_COLOR, hidden: false, sortOrder: 999, colorCustomized: false, ...patch },
    ];
  }
  return settings.map((s, i) => (i === index ? { ...s, ...patch } : s));
}

/** Crea o recolorea un grupo (equivale al POST legacy). */
export function addGroup(settings: readonly GroupSetting[], name: string, color: string): GroupSetting[] {
  return upsertSetting([...settings], name.trim(), { name: name.trim(), color, colorCustomized: true, hidden: false });
}

export type GroupChange<T> = { settings: GroupSetting[]; credentials: T[] } | { error: string };

/** Renombra: oculta el nombre viejo, crea el nuevo y reescribe las credenciales afectadas. */
export function renameGroup<T extends RuleCredential>(
  settings: readonly GroupSetting[],
  list: readonly T[],
  currentName: string,
  newName: string,
  color: string,
): GroupChange<T> {
  const current = currentName.trim();
  const next = newName.trim();
  const clash = settings.some(
    (s) => !s.hidden && lower(s.name) === lower(next) && lower(s.name) !== lower(current),
  );
  if (clash) return { error: "Ya existe un grupo con ese nombre." };

  let updated = upsertSetting([...settings], current, { hidden: true });
  updated = upsertSetting(updated, next, { name: next, color, colorCustomized: true, hidden: false });
  const credentials = list
    .filter((item) => lower(item.groupName) === lower(current))
    .map((item) => ({ ...item, groupName: next }));
  return { settings: updated, credentials };
}

/** Elimina: oculta el grupo y deja sin grupo a sus credenciales. */
export function deleteGroup<T extends RuleCredential>(
  settings: readonly GroupSetting[],
  list: readonly T[],
  name: string,
): { settings: GroupSetting[]; credentials: T[] } {
  const target = name.trim();
  return {
    settings: upsertSetting([...settings], target, { hidden: true }),
    credentials: list.filter((item) => lower(item.groupName) === lower(target)).map((item) => ({ ...item, groupName: "" })),
  };
}
