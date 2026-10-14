import type { APIRoute } from "astro";
import { parseCredentialInput, parseSealed, type CredentialInput } from "@/lib/server/credential-input";
import { fail, isUuid, ok, readBody } from "@/lib/server/http";
import { settingsUpsert } from "@/lib/server/user-settings";
import { getTurso } from "@/lib/turso";

export const prerender = false;

const MAX_OPERATIONS = 500;

class NotFound extends Error {}

// Borrar con dependientes o renombrar un grupo reescribe varias filas: todo en una transaccion
// para no dejar referencias colgando. Cualquier fila ajena aborta y revierte (mismo 404).
export const POST: APIRoute = async ({ request, locals }) => {
  const body = await readBody(request);
  const rawUpserts = Array.isArray(body?.upserts) ? body.upserts : [];
  const rawDeletes = Array.isArray(body?.deletes) ? body.deletes : [];
  if (rawUpserts.length + rawDeletes.length === 0 && !body?.settings) return fail("No hay cambios que guardar.", 400);
  if (rawUpserts.length + rawDeletes.length > MAX_OPERATIONS) return fail("Demasiados cambios a la vez.", 400);

  const upserts = rawUpserts.map(parseCredentialInput);
  if (upserts.some((item) => item === null)) return fail("Datos de la cuenta no válidos.", 400);
  if (!rawDeletes.every(isUuid)) return fail("Datos de la cuenta no válidos.", 400);
  const settings = body?.settings == null ? null : parseSealed(body.settings);
  if (body?.settings != null && !settings) return fail("Ajustes no válidos.", 400);

  const touched = [...(upserts as CredentialInput[]).map((item) => item.id), ...(rawDeletes as string[])];
  if (new Set(touched).size !== touched.length) return fail("Cambios duplicados.", 400);

  const userId = locals.userId!;
  try {
    const database = await getTurso();
    const tx = await database.transaction("write");
    try {
      for (const item of upserts as CredentialInput[]) {
        // El WHERE del DO UPDATE solo deja pasar filas del propio usuario: un id ajeno o legacy no cambia nada.
        const result = await tx.execute({
          sql: `INSERT INTO credentials (id, name, login_method, user_id, payload, payload_iv, payload_version)
            VALUES (?, ?, '', ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, payload = excluded.payload,
              payload_iv = excluded.payload_iv, payload_version = 1, updated_at = CURRENT_TIMESTAMP
            WHERE credentials.user_id = excluded.user_id`,
          args: [item.id, item.name, userId, item.payload, item.payloadIv],
        });
        if (result.rowsAffected !== 1) throw new NotFound();
      }
      for (const id of rawDeletes as string[]) {
        const result = await tx.execute({ sql: "DELETE FROM credentials WHERE id = ? AND user_id = ?", args: [id, userId] });
        if (result.rowsAffected !== 1) throw new NotFound();
      }
      if (settings) await tx.execute(settingsUpsert(userId, settings));
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof NotFound) return fail("Cuenta no encontrada.", 404);
    console.error("User vault batch error:", error);
    return fail("No se pudieron guardar los cambios.", 503);
  }
};
