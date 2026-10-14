import type { APIRoute } from "astro";
import { safeEqual } from "@/lib/server/constant-time";
import { fail, ok, readBody } from "@/lib/server/http";
import { consumeAttempt, resetAttempts } from "@/lib/server/rate-limit";
import { createVaultSession, VAULT_COOKIE, vaultCookieOptions } from "@/lib/server/vault-session";
import { sha256Hex, toWrapperRow } from "@/lib/server/vault-users";
import { AUTH_TOKEN_PATTERN } from "@/lib/server/wrapper-input";
import { SESSION_COOKIE } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";

export const prerender = false;

const GENERIC_FAILURE = "Código de recuperación incorrecto.";

// El servidor solo entrega el wrapper de recuperacion contra la prueba (authToken), nunca "a pedido".
export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await readBody(request);
  const panelToken = cookies.get(SESSION_COOKIE)?.value;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!panelToken || !userId || typeof body?.authToken !== "string" || !AUTH_TOKEN_PATTERN.test(body.authToken)) {
    return fail(GENERIC_FAILURE, 400);
  }

  try {
    const key = `recovery:${userId}`;
    const limit = await consumeAttempt(key);
    if (!limit.allowed) {
      return fail("Demasiados intentos. Espera unos minutos.", 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const database = await getTurso();
    const result = await database.execute({
      sql: `SELECT u.recovery_auth_hash, w.id, w.kdf_salt, w.kdf_iters, w.iv, w.wrapped_dek
        FROM vault_users u JOIN vault_key_wrappers w ON w.user_id = u.id AND w.kind = 'recovery'
        WHERE u.id = ? AND u.status = 'active'`,
      args: [userId],
    });
    const row = result.rows[0];
    // Con usuario inexistente se compara igual contra un valor fijo para no variar el camino de ejecucion.
    const expected = row ? String(row.recovery_auth_hash) : "0".repeat(64);
    const matches = safeEqual(sha256Hex(body.authToken), expected);
    if (!row || !matches) return fail(GENERIC_FAILURE, 401);

    await resetAttempts(key);
    cookies.set(VAULT_COOKIE, await createVaultSession(userId, panelToken), vaultCookieOptions);
    return ok({ userId, wrapper: toWrapperRow(row) });
  } catch (error) {
    console.error("Recovery unlock error:", error);
    return fail("No se pudo desbloquear con el código.", 503);
  }
};
