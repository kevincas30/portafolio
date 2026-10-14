import type { APIRoute } from "astro";
import { parseSealed } from "@/lib/server/credential-input";
import { fail, ok, readBody } from "@/lib/server/http";
import { settingsUpsert } from "@/lib/server/user-settings";
import { getTurso } from "@/lib/turso";

export const prerender = false;

const dbError = (error: unknown) => {
  console.error("User vault settings error:", error);
  return fail("No se pudieron cargar los ajustes.", 503);
};

// Ajustes de grupos del usuario: un unico blob cifrado, siempre filtrado por locals.userId (VS-8).
export const GET: APIRoute = async ({ locals }) => {
  try {
    const database = await getTurso();
    const result = await database.execute({
      sql: "SELECT payload, payload_iv FROM vault_user_settings WHERE user_id = ?",
      args: [locals.userId!],
    });
    const row = result.rows[0];
    return ok({ settings: row ? { payload: String(row.payload), payloadIv: String(row.payload_iv) } : null });
  } catch (error) {
    return dbError(error);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const sealed = parseSealed(await readBody(request));
  if (!sealed) return fail("Ajustes no válidos.", 400);
  try {
    const database = await getTurso();
    await database.execute(settingsUpsert(locals.userId!, sealed));
    return ok({ ok: true });
  } catch (error) {
    return dbError(error);
  }
};
