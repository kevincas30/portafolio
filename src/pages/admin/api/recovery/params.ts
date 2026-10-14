import type { APIRoute } from "astro";
import { fail, ok } from "@/lib/server/http";
import { getTurso } from "@/lib/turso";

export const prerender = false;

// Parametros publicos del KDF del codigo de recuperacion (salt e iteraciones). Requiere sesion de panel.
export const GET: APIRoute = async ({ url }) => {
  const userId = url.searchParams.get("userId") ?? "";
  try {
    const database = await getTurso();
    const result = await database.execute({
      sql: "SELECT kdf_salt, kdf_iters FROM vault_key_wrappers WHERE user_id = ? AND kind = 'recovery'",
      args: [userId],
    });
    const row = result.rows[0];
    if (!row) return fail("Usuario no encontrado.", 404);
    return ok({ kdfSalt: String(row.kdf_salt), kdfIters: Number(row.kdf_iters) });
  } catch (error) {
    console.error("Recovery params error:", error);
    return fail("No se pudo preparar la recuperación.", 503);
  }
};
