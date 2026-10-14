import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { getTurso, TursoConfigurationError } from "@/lib/turso";
import type { Credential, CredentialPayload, CredentialProvider, LoginMethod } from "@/types/credential";

export const prerender = false;

const loginMethods = new Set<LoginMethod>(["password", "google", "email_code", "magic_link", "other", "website"]);

function databaseError(error: unknown) {
  const message = error instanceof TursoConfigurationError
    ? "Turso no está configurado."
    : "No se pudo acceder a las credenciales.";
  if (!(error instanceof TursoConfigurationError)) console.error("Credentials database error:", error);
  return json({ error: message }, { status: 503 });
}

function stringWithin(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function nullableId(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0 && value.length <= 128);
}

function validWebUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isCredentialPayload(value: unknown): value is CredentialPayload {
  if (!value || typeof value !== "object" || "password" in value) return false;
  const item = value as Partial<CredentialPayload>;
  return (
    stringWithin(item.id, 128) && item.id.length > 0 &&
    stringWithin(item.name, 160) && item.name.trim().length > 0 &&
    stringWithin(item.platform, 160) &&
    stringWithin(item.category, 160) &&
    (item.groupName === undefined || stringWithin(item.groupName, 160)) &&
    stringWithin(item.url, 2048) && validWebUrl(item.url) &&
    (item.provider === undefined || item.provider === null || item.provider === "google") &&
    typeof item.loginMethod === "string" && loginMethods.has(item.loginMethod as LoginMethod) &&
    stringWithin(item.email, 320) &&
    stringWithin(item.username, 320) &&
    (item.encryptedPassword === null || stringWithin(item.encryptedPassword, 20_000)) &&
    (item.passwordIv === null || stringWithin(item.passwordIv, 256)) &&
    nullableId(item.loginCredentialId) &&
    nullableId(item.emailCredentialId) &&
    stringWithin(item.accessInstructions, 4000) &&
    stringWithin(item.notes, 8000) &&
    typeof item.favorite === "boolean" &&
    ((item.encryptedPassword === null && item.passwordIv === null) ||
      (Boolean(item.encryptedPassword) && Boolean(item.passwordIv))) &&
    (item.loginMethod !== "password" || Boolean(item.encryptedPassword && item.passwordIv)) &&
    (item.loginMethod !== "website" || Boolean(item.url)) &&
    (item.provider == null || item.loginMethod === "password") &&
    (item.loginMethod !== "other" || item.accessInstructions.trim().length > 0) &&
    ((item.loginMethod !== "email_code" && item.loginMethod !== "magic_link") || item.email.trim().length > 0)
  );
}

function rowToCredential(row: Record<string, unknown>): Credential {
  return {
    id: String(row.id),
    name: String(row.name),
    platform: String(row.platform),
    category: String(row.category),
    groupName: String(row.group_name ?? ""),
    url: String(row.url),
    provider: row.provider === "google" ? "google" : null,
    loginMethod: String(row.login_method) as LoginMethod,
    email: String(row.email),
    username: String(row.username),
    encryptedPassword: row.encrypted_password === null ? null : String(row.encrypted_password),
    passwordIv: row.password_iv === null ? null : String(row.password_iv),
    loginCredentialId: row.login_credential_id === null ? null : String(row.login_credential_id),
    emailCredentialId: row.email_credential_id === null ? null : String(row.email_credential_id),
    accessInstructions: String(row.access_instructions),
    notes: String(row.notes),
    favorite: Number(row.favorite) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function findCredential(id: string) {
  const database = await getTurso();
  const result = await database.execute({
    sql: "SELECT * FROM credentials WHERE id = ? AND user_id IS NULL",
    args: [id],
  });
  return result.rows[0] ? rowToCredential(result.rows[0] as Record<string, unknown>) : null;
}

function resolvedProvider(payload: CredentialPayload): CredentialProvider {
  if (payload.loginMethod !== "password") return null;
  return payload.provider ?? null;
}

async function findDuplicateGoogleCredential(email: string, excludingId?: string): Promise<Credential | null> {
  const normalizedEmail = email.trim().toLocaleLowerCase("es");
  if (!normalizedEmail) return null;

  const database = await getTurso();
  const result = await database.execute({
    sql: `SELECT * FROM credentials
      WHERE provider = 'google'
        AND lower(trim(email)) = ?
        AND (? IS NULL OR id <> ?)
      ORDER BY created_at
      LIMIT 1`,
    args: [normalizedEmail, excludingId ?? null, excludingId ?? null],
  });
  return result.rows[0] ? rowToCredential(result.rows[0] as Record<string, unknown>) : null;
}

function duplicateGoogleResponse(existingCredential: Credential) {
  return json({
    error: "Esta cuenta Google ya está guardada.",
    existingCredential,
  }, { status: 409 });
}

async function validateRelations(payload: CredentialPayload): Promise<string | null> {
  const relationIds = [payload.loginCredentialId, payload.emailCredentialId].filter(Boolean) as string[];
  if (relationIds.includes(payload.id)) return "Una cuenta no puede relacionarse consigo misma.";
  if (payload.loginMethod === "google" && !payload.loginCredentialId) {
    return "Selecciona la cuenta Google utilizada para iniciar sesión.";
  }
  if (relationIds.length === 0) return null;

  const database = await getTurso();
  const placeholders = relationIds.map(() => "?").join(",");
  const result = await database.execute({
    sql: `SELECT id, provider, login_method FROM credentials WHERE id IN (${placeholders})`,
    args: relationIds,
  });
  if (result.rows.length !== new Set(relationIds).size) return "La credencial relacionada no existe.";

  const isCompatibleGoogle = (row: Record<string, unknown>) =>
    row.login_method === "password" && row.provider === "google";

  if (payload.loginCredentialId) {
    const target = result.rows.find((row) => String(row.id) === payload.loginCredentialId);
    if (!target || !isCompatibleGoogle(target as Record<string, unknown>)) {
      return "Selecciona una credencial Google o Gmail compatible.";
    }
  }
  if (payload.emailCredentialId) {
    const target = result.rows.find((row) => String(row.id) === payload.emailCredentialId);
    if (!target || !isCompatibleGoogle(target as Record<string, unknown>)) {
      return "Selecciona una credencial de correo Google o Gmail compatible.";
    }
  }

  return null;
}

export const GET: APIRoute = async () => {
  try {
    const database = await getTurso();
    const result = await database.execute("SELECT * FROM credentials WHERE user_id IS NULL ORDER BY favorite DESC, name COLLATE NOCASE");
    return json({
      credentials: result.rows.map((row) => rowToCredential(row as Record<string, unknown>)),
    }, { headers: noStore });
  } catch (error) {
    return databaseError(error);
  }
};

async function parsePayload(request: Request) {
  try {
    const body: unknown = await request.json();
    return isCredentialPayload(body) ? body : null;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);
  if (!payload) return json({ error: "Datos de credencial no válidos." }, { status: 400 });

  try {
    const normalizedPayload = {
      ...payload,
      groupName: payload.groupName ?? "",
      provider: resolvedProvider(payload),
    };
    const relationError = await validateRelations(normalizedPayload);
    if (relationError) return json({ error: relationError }, { status: 400 });
    if (normalizedPayload.provider === "google") {
      const duplicate = await findDuplicateGoogleCredential(normalizedPayload.email);
      if (duplicate) return duplicateGoogleResponse(duplicate);
    }
    const database = await getTurso();
    const insertArgs = [
      normalizedPayload.id, normalizedPayload.name.trim(), normalizedPayload.platform.trim(), normalizedPayload.category.trim(), normalizedPayload.groupName.trim(), normalizedPayload.url.trim(),
      normalizedPayload.provider, normalizedPayload.loginMethod, normalizedPayload.email.trim(), normalizedPayload.username.trim(), normalizedPayload.encryptedPassword,
      normalizedPayload.passwordIv, normalizedPayload.loginCredentialId, normalizedPayload.emailCredentialId,
      normalizedPayload.accessInstructions.trim(), normalizedPayload.notes.trim(), normalizedPayload.favorite ? 1 : 0,
    ];
    const protectsGoogleIdentity = normalizedPayload.provider === "google" && Boolean(normalizedPayload.email.trim());
    const insertResult = await database.execute({
      sql: `INSERT INTO credentials (
          id, name, platform, category, group_name, url, provider, login_method, email, username,
          encrypted_password, password_iv, login_credential_id, email_credential_id,
          access_instructions, notes, favorite
        )
        ${protectsGoogleIdentity
          ? "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM credentials WHERE provider = 'google' AND lower(trim(email)) = ?)"
          : "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"}`,
      args: protectsGoogleIdentity
        ? [...insertArgs, normalizedPayload.email.trim().toLocaleLowerCase("es")]
        : insertArgs,
    });
    if (protectsGoogleIdentity && insertResult.rowsAffected === 0) {
      const duplicate = await findDuplicateGoogleCredential(normalizedPayload.email);
      if (duplicate) return duplicateGoogleResponse(duplicate);
      return json({ error: "No se pudo guardar la cuenta Google." }, { status: 409 });
    }
    return json({ credential: await findCredential(normalizedPayload.id) }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);
  if (!payload) return json({ error: "Datos de credencial no válidos." }, { status: 400 });

  try {
    const existing = await findCredential(payload.id);
    if (!existing) return json({ error: "La credencial no existe." }, { status: 404 });
    const normalizedPayload = {
      ...payload,
      groupName: payload.groupName ?? "",
      provider: resolvedProvider(payload),
    };
    const relationError = await validateRelations(normalizedPayload);
    if (relationError) return json({ error: relationError }, { status: 400 });
    const googleIdentityChanged = normalizedPayload.provider === "google" && (
      existing.provider !== "google" ||
      existing.email.trim().toLocaleLowerCase("es") !== normalizedPayload.email.trim().toLocaleLowerCase("es")
    );
    if (googleIdentityChanged) {
      const duplicate = await findDuplicateGoogleCredential(normalizedPayload.email, normalizedPayload.id);
      if (duplicate) return duplicateGoogleResponse(duplicate);
    }

    const database = await getTurso();
    await database.execute({
      sql: `UPDATE credentials SET
        name = ?, platform = ?, category = ?, group_name = ?, url = ?, provider = ?, login_method = ?, email = ?, username = ?,
        encrypted_password = ?, password_iv = ?, login_credential_id = ?, email_credential_id = ?,
        access_instructions = ?, notes = ?, favorite = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id IS NULL`,
      args: [
        normalizedPayload.name.trim(), normalizedPayload.platform.trim(), normalizedPayload.category.trim(), normalizedPayload.groupName.trim(), normalizedPayload.url.trim(),
        normalizedPayload.provider, normalizedPayload.loginMethod, normalizedPayload.email.trim(), normalizedPayload.username.trim(), normalizedPayload.encryptedPassword,
        normalizedPayload.passwordIv, normalizedPayload.loginCredentialId, normalizedPayload.emailCredentialId,
        normalizedPayload.accessInstructions.trim(), normalizedPayload.notes.trim(), normalizedPayload.favorite ? 1 : 0, normalizedPayload.id,
      ],
    });
    return json({ credential: await findCredential(normalizedPayload.id) });
  } catch (error) {
    return databaseError(error);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  let body: { id?: unknown; force?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; force?: unknown };
  } catch {
    return json({ error: "Petición no válida." }, { status: 400 });
  }

  if (typeof body.id !== "string" || body.id.length === 0 || body.id.length > 128) {
    return json({ error: "Credencial no válida." }, { status: 400 });
  }

  try {
    const database = await getTurso();
    const related = await database.execute({
      sql: "SELECT * FROM credentials WHERE login_credential_id = ? OR email_credential_id = ? ORDER BY name",
      args: [body.id, body.id],
    });
    const dependencies = related.rows.map((row) => rowToCredential(row as Record<string, unknown>));

    if (dependencies.length > 0 && body.force !== true) {
      return json({
        error: `Esta cuenta se utiliza para iniciar sesión en ${dependencies.length} plataformas.`,
        dependencies,
      }, { status: 409 });
    }

    await database.batch([
      { sql: "UPDATE credentials SET login_credential_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE login_credential_id = ?", args: [body.id] },
      { sql: "UPDATE credentials SET email_credential_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE email_credential_id = ?", args: [body.id] },
      { sql: "DELETE FROM credentials WHERE id = ? AND user_id IS NULL", args: [body.id] },
    ], "write");
    return json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
};
