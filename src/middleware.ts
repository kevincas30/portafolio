import { defineMiddleware } from "astro:middleware";
import { hasSiteSession, SESSION_COOKIE } from "@/lib/site-session";
import { ADMIN_BASE } from "@/lib/base-path";

const ADMIN_API_PREFIX = `${ADMIN_BASE}/api/`;
const PUBLIC_API_PATHS = new Set([`${ADMIN_BASE}/api/vault`, `${ADMIN_BASE}/api/site-session`]);

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (!path.startsWith(ADMIN_API_PREFIX) || PUBLIC_API_PATHS.has(path)) return next();

  try {
    if (await hasSiteSession(context.cookies.get(SESSION_COOKIE)?.value)) {
      const response = await next();
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  } catch {
    return new Response(JSON.stringify({ error: "No se pudo comprobar el acceso al panel." }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  return new Response(JSON.stringify({ error: "Introduce la contraseña maestra para entrar." }), {
    status: 401,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
