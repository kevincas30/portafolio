import { defineMiddleware } from "astro:middleware";
import { hasSiteSession, SESSION_COOKIE } from "@/lib/site-session";
import { ADMIN_BASE } from "@/lib/base-path";
import { resolveVaultSession, VAULT_COOKIE, vaultCookieOptions } from "@/lib/server/vault-session";

const ADMIN_API_PREFIX = `${ADMIN_BASE}/api/`;
const PUBLIC_API_PATHS = new Set([`${ADMIN_BASE}/api/vault`, `${ADMIN_BASE}/api/site-session`]);
const VAULT_API_PREFIX = `${ADMIN_API_PREFIX}user-vault/`;
// Bloquear la boveda solo necesita la sesion del panel (tiene que funcionar aunque la de boveda haya vencido).
const VAULT_SESSION_PATH = `${VAULT_API_PREFIX}session`;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Browsers always send Origin on POST/PUT/PATCH/DELETE, same-origin included.
// A missing or foreign Origin means the request didn't come from our pages (CSRF).
function isSameOriginWrite(request: Request, siteOrigin: string): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  return request.headers.get("origin") === siteOrigin;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const isApi = path.startsWith(ADMIN_API_PREFIX) || path.startsWith("/api/");

  if (isApi && !isSameOriginWrite(context.request, context.url.origin)) {
    return jsonError("Solicitud no permitida.", 403);
  }

  if (!path.startsWith(ADMIN_API_PREFIX) || PUBLIC_API_PATHS.has(path)) return next();

  try {
    const panelToken = context.cookies.get(SESSION_COOKIE)?.value;
    if (await hasSiteSession(panelToken)) {
      if (path.startsWith(VAULT_API_PREFIX) && path !== VAULT_SESSION_PATH) {
        const vaultToken = context.cookies.get(VAULT_COOKIE)?.value;
        const userId = await resolveVaultSession(vaultToken, panelToken);
        if (!userId) return jsonError("Desbloquea tu bóveda para continuar.", 401);
        context.locals.userId = userId;
        context.cookies.set(VAULT_COOKIE, vaultToken!, vaultCookieOptions);
      }
      const response = await next();
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  } catch {
    return jsonError("No se pudo comprobar el acceso al panel.", 503);
  }

  return jsonError("Introduce la contraseña maestra para entrar.", 401);
});
