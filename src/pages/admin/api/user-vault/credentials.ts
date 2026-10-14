import type { APIRoute } from "astro";
import { parseCredentialInput } from "@/lib/server/credential-input";
import { fail, isUuid, ok, readBody } from "@/lib/server/http";
import { getTurso } from "@/lib/turso";

export const prerender = false;

// Toda consulta lleva `AND user_id = ?` con locals.userId. Un id ajeno responde igual que uno inexistente (VS-5).
const NOT_FOUND = () => fail("Cuenta no encontrada.", 404);
const dbError = (error: unknown) => {
  console.error("User vault credentials error:", error);
  return fail("No se pudo acceder a las cuentas.", 503);
};

export const GET: APIRoute = async ({ locals }) => {
  try {
    const database = await getTurso();
    const result = await database.execute({
      sql: `SELECT id, name, payload, payload_iv, created_at, updated_at
        FROM credentials WHERE user_id = ? AND payload IS NOT NULL ORDER BY name COLLATE NOCASE`,
      args: [locals.userId!],
    });
    return ok({
      credentials: result.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        payload: String(row.payload),
        payloadIv: String(row.payload_iv),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })),
    });
  } catch (error) {
    return dbError(error);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const input = parseCredentialInput(await readBody(request));
  if (!input) return fail("Datos de la cuenta no válidos.", 400);
  try {
    const database = await getTurso();
    // login_method es NOT NULL en el esquema legacy; las columnas legacy quedan en sus defaults.
    await database.execute({
      sql: `INSERT INTO credentials (id, name, login_method, user_id, payload, payload_iv, payload_version)
        VALUES (?, ?, '', ?, ?, ?, 1)`,
      args: [input.id, input.name, locals.userId!, input.payload, input.payloadIv],
    });
    return ok({ id: input.id }, 201);
  } catch (error) {
    if (error instanceof Error && /constraint/i.test(error.message)) return fail("No se pudo crear la cuenta.", 409);
    return dbError(error);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const input = parseCredentialInput(await readBody(request));
  if (!input) return fail("Datos de la cuenta no válidos.", 400);
  try {
    const database = await getTurso();
    const result = await database.execute({
      sql: `UPDATE credentials SET name = ?, payload = ?, payload_iv = ?, payload_version = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`,
      args: [input.name, input.payload, input.payloadIv, input.id, locals.userId!],
    });
    return result.rowsAffected === 1 ? ok({ id: input.id }) : NOT_FOUND();
  } catch (error) {
    return dbError(error);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const body = await readBody(request);
  if (!isUuid(body?.id)) return NOT_FOUND();
  try {
    const database = await getTurso();
    const result = await database.execute({
      sql: "DELETE FROM credentials WHERE id = ? AND user_id = ?",
      args: [body.id, locals.userId!],
    });
    return result.rowsAffected === 1 ? ok({ ok: true }) : NOT_FOUND();
  } catch (error) {
    return dbError(error);
  }
};
