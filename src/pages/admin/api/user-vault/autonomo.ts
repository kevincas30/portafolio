import type { APIRoute } from "astro";
import { parseSealed, type SealedInput } from "@/lib/server/credential-input";
import { fail, isUuid, ok, readBody } from "@/lib/server/http";
import { getTurso } from "@/lib/turso";

export const prerender = false;

const MAX_OPERATIONS = 500;

class NotFound extends Error {}

type SealedInvoice = SealedInput & { id: string };

function parseInvoice(value: unknown): SealedInvoice | null {
  const sealed = parseSealed(value);
  const id = (value as Record<string, unknown> | null)?.id;
  return sealed && isUuid(id) ? { id, ...sealed } : null;
}

// Facturas y ajustes de autonomo: blobs cifrados, siempre filtrados por locals.userId.
// El servidor no ve importes, clientes ni fechas: los impuestos se calculan en el navegador.
export const GET: APIRoute = async ({ locals }) => {
  try {
    const database = await getTurso();
    const [invoices, settings] = await database.batch([
      {
        sql: "SELECT id, payload, payload_iv, created_at, updated_at FROM autonomo_invoices WHERE user_id = ?",
        args: [locals.userId!],
      },
      { sql: "SELECT payload, payload_iv FROM autonomo_settings WHERE user_id = ?", args: [locals.userId!] },
    ], "read");
    const settingsRow = settings.rows[0];
    return ok({
      invoices: invoices.rows.map((row) => ({
        id: String(row.id),
        payload: String(row.payload),
        payloadIv: String(row.payload_iv),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })),
      settings: settingsRow ? { payload: String(settingsRow.payload), payloadIv: String(settingsRow.payload_iv) } : null,
    });
  } catch (error) {
    console.error("User vault autonomo error:", error);
    return fail("No se pudieron cargar tus datos de autónomo.", 503);
  }
};

// Mismo contrato que finanzas: todo en una transaccion y una fila ajena aborta y revierte (404).
export const POST: APIRoute = async ({ request, locals }) => {
  const body = await readBody(request);
  const rawUpserts = Array.isArray(body?.upserts) ? body.upserts : [];
  const rawDeletes = Array.isArray(body?.deletes) ? body.deletes : [];
  if (rawUpserts.length + rawDeletes.length === 0 && !body?.settings) return fail("No hay cambios que guardar.", 400);
  if (rawUpserts.length + rawDeletes.length > MAX_OPERATIONS) return fail("Demasiados cambios a la vez.", 400);

  const upserts = rawUpserts.map(parseInvoice);
  if (upserts.some((item) => item === null)) return fail("Datos de la factura no válidos.", 400);
  if (!rawDeletes.every(isUuid)) return fail("Datos de la factura no válidos.", 400);
  const settings = body?.settings == null ? null : parseSealed(body.settings);
  if (body?.settings != null && !settings) return fail("Ajustes no válidos.", 400);

  const touched = [...(upserts as SealedInvoice[]).map((item) => item.id), ...(rawDeletes as string[])];
  if (new Set(touched).size !== touched.length) return fail("Cambios duplicados.", 400);

  const userId = locals.userId!;
  try {
    const database = await getTurso();
    const tx = await database.transaction("write");
    try {
      for (const item of upserts as SealedInvoice[]) {
        // El WHERE del DO UPDATE solo deja pasar filas del propio usuario: un id ajeno no cambia nada.
        const result = await tx.execute({
          sql: `INSERT INTO autonomo_invoices (id, user_id, payload, payload_iv, payload_version)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, payload_iv = excluded.payload_iv,
              payload_version = 1, updated_at = CURRENT_TIMESTAMP
            WHERE autonomo_invoices.user_id = excluded.user_id`,
          args: [item.id, userId, item.payload, item.payloadIv],
        });
        if (result.rowsAffected !== 1) throw new NotFound();
      }
      for (const id of rawDeletes as string[]) {
        const result = await tx.execute({ sql: "DELETE FROM autonomo_invoices WHERE id = ? AND user_id = ?", args: [id, userId] });
        if (result.rowsAffected !== 1) throw new NotFound();
      }
      if (settings) {
        await tx.execute({
          sql: `INSERT INTO autonomo_settings (user_id, payload, payload_iv, payload_version)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, payload_iv = excluded.payload_iv, updated_at = CURRENT_TIMESTAMP`,
          args: [userId, settings.payload, settings.payloadIv],
        });
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof NotFound) return fail("Factura no encontrada.", 404);
    console.error("User vault autonomo batch error:", error);
    return fail("No se pudieron guardar los cambios.", 503);
  }
};
