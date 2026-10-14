import type { APIRoute } from "astro";
import { fail, ok } from "@/lib/server/http";
import { deleteVaultSession, VAULT_COOKIE, vaultCookieOptions } from "@/lib/server/vault-session";

export const prerender = false;

// Bloquear la boveda: borra la fila de la sesion (no solo la cookie) y limpia la cookie.
export const DELETE: APIRoute = async ({ cookies }) => {
  try {
    await deleteVaultSession(cookies.get(VAULT_COOKIE)?.value);
    cookies.set(VAULT_COOKIE, "", { ...vaultCookieOptions, maxAge: 0 });
    return ok({ ok: true });
  } catch (error) {
    console.error("Vault session delete error:", error);
    return fail("No se pudo bloquear la bóveda.", 503);
  }
};
