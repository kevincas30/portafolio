// Transformacion pura de la boveda legacy (clave derivada del password maestro) al formato por usuario.
// No toca red ni DOM: el orquestador (MigrateLegacyVault) pone la I/O.
import { decryptPassword } from "@/lib/credential-crypto";
import type { Credential } from "@/types/credential";
import {
  decodeCredentialBlob,
  decodeSettingsBlob,
  encodeCredentialBlob,
  encodeSettingsBlob,
  type CredentialBlob,
  type GroupSetting,
} from "./blob";
import type { Sealed } from "./crypto";

export class MigrationError extends Error {
  readonly rowId: string | null;
  constructor(message: string, rowId: string | null = null) {
    super(message);
    this.name = "MigrationError";
    this.rowId = rowId;
  }
}

export interface LegacyGroupSetting {
  name: string;
  color: string;
  hidden: boolean;
  sortOrder: number;
  colorCustomized: boolean;
}

export interface MigratedRow {
  id: string;
  name: string;
  payload: string;
  payloadIv: string;
  /** Fuente de verdad para la verificacion posterior. */
  expected: CredentialBlob;
}

export interface MigratedSettings {
  payload: string;
  payloadIv: string;
  expected: GroupSetting[];
}

/** Legacy -> blob v1 (password en claro: "plaintext:v1" pasa tal cual, el resto se descifra con la clave vieja). */
export async function legacyRowToBlob(row: Credential, legacyKey: CryptoKey | null): Promise<CredentialBlob> {
  let password = "";
  if (row.encryptedPassword !== null && row.passwordIv !== null) {
    try {
      password = await decryptPassword(row.encryptedPassword, row.passwordIv, legacyKey);
    } catch {
      throw new MigrationError("No se pudo descifrar la contraseña legacy.", row.id);
    }
  }
  return {
    v: 1,
    platform: row.platform,
    category: row.category,
    groupName: row.groupName,
    url: row.url,
    provider: row.provider,
    loginMethod: row.loginMethod,
    email: row.email,
    username: row.username,
    password,
    loginCredentialId: row.loginCredentialId,
    emailCredentialId: row.emailCredentialId,
    accessInstructions: row.accessInstructions,
    notes: row.notes,
    favorite: row.favorite,
  };
}

/** Todo o nada: ante la primera fila que falle lanza y no devuelve resultados parciales. */
export async function transformLegacyRows(
  rows: readonly Credential[],
  legacyKey: CryptoKey | null,
  dek: CryptoKey,
  userId: string,
): Promise<MigratedRow[]> {
  const output: MigratedRow[] = [];
  for (const row of rows) {
    const expected = await legacyRowToBlob(row, legacyKey);
    const sealed = await encodeCredentialBlob(expected, dek, userId, row.id);
    output.push({ id: row.id, name: row.name, payload: sealed.data, payloadIv: sealed.iv, expected });
  }
  if (output.length !== rows.length) throw new MigrationError("Conteo de filas inconsistente.");
  return output;
}

export async function transformLegacySettings(
  groups: readonly LegacyGroupSetting[],
  dek: CryptoKey,
  userId: string,
): Promise<MigratedSettings> {
  const expected = groups.map((g) => ({ ...g }));
  const sealed = await encodeSettingsBlob(expected, dek, userId);
  return { payload: sealed.data, payloadIv: sealed.iv, expected };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/**
 * Paso de verificacion: re-descifra cada salida y la compara con la fuente.
 * Cualquier diferencia (o fallo de descifrado) aborta con MigrationError.
 */
export async function verifyMigration(
  rows: readonly MigratedRow[],
  settings: MigratedSettings | null,
  dek: CryptoKey,
  userId: string,
): Promise<void> {
  for (const row of rows) {
    const sealed: Sealed = { data: row.payload, iv: row.payloadIv };
    let decoded: CredentialBlob;
    try {
      decoded = await decodeCredentialBlob(sealed, dek, userId, row.id);
    } catch {
      throw new MigrationError("La verificacion no pudo descifrar la fila migrada.", row.id);
    }
    if (!deepEqual(decoded, row.expected)) {
      throw new MigrationError("La verificacion encontro diferencias en la fila migrada.", row.id);
    }
  }
  if (settings) {
    try {
      const decoded = await decodeSettingsBlob({ data: settings.payload, iv: settings.payloadIv }, dek, userId);
      if (!deepEqual(decoded.groups, settings.expected)) throw new Error("diff");
    } catch {
      throw new MigrationError("La verificacion de los ajustes de grupos fallo.");
    }
  }
}
