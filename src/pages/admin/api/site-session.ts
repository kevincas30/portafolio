import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { createSiteSession, deleteSiteSession, hasSiteSession, renewSiteSession, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/site-session";
import { verifyPanelLogin } from "@/lib/server/panel-auth";
import { consumeAttempt, resetAttempts } from "@/lib/server/rate-limit";

export const prerender = false;

// Intentos de login por ventana de 15 min sumando todas las IPs.
const GLOBAL_KEY = "panel:global";
const GLOBAL_LIMIT = 100;

const cookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: import.meta.env.PROD, path: "/", maxAge: SESSION_SECONDS };

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    return (source.protocol === "http:" || source.protocol === "https:") && source.host === request.headers.get("host");
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request)) return json({ error: "Solicitud no permitida." }, { status: 403 });
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }
  if (typeof body.password !== "string" || !body.password || body.password.length > 1024) {
    return json({ error: "Escribe la contraseña maestra." }, { status: 400 });
  }

  try {
    const key = `panel:${address}`;
    const limit = await consumeAttempt(key);
    // Tope global: un ataque repartido entre muchas IPs tambien se frena (no se reinicia al entrar bien).
    const global = limit.allowed ? await consumeAttempt(GLOBAL_KEY, GLOBAL_LIMIT) : limit;
    if (!global.allowed) {
      return json({ error: "Demasiados intentos. Espera unos minutos antes de volver a entrar." }, { status: 429, headers: { ...noStore, "Retry-After": String(global.retryAfterSeconds) } });
    }
    if (!await verifyPanelLogin(body.password)) {
      return json({ error: "La contraseña maestra no es correcta." }, { status: 401, headers: noStore });
    }
    const token = await createSiteSession();
    await deleteSiteSession(cookies.get(SESSION_COOKIE)?.value);
    await resetAttempts(key);
    cookies.set(SESSION_COOKIE, token, cookieOptions);
    return json({ ok: true }, { headers: noStore });
  } catch {
    return json({ error: "No se pudo abrir el panel. Inténtalo de nuevo." }, { status: 503, headers: noStore });
  }
};

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get(SESSION_COOKIE)?.value;
    if (!await hasSiteSession(token)) return json({ error: "Vuelve a introducir la contraseña maestra." }, { status: 401, headers: noStore });
    await renewSiteSession(token!);
    cookies.set(SESSION_COOKIE, token!, cookieOptions);
    return json({ ok: true }, { headers: noStore });
  } catch {
    return json({ error: "No se pudo comprobar la sesión." }, { status: 503, headers: noStore });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!sameOrigin(request)) return json({ error: "Solicitud no permitida." }, { status: 403 });
  try {
    await deleteSiteSession(cookies.get(SESSION_COOKIE)?.value);
    cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return json({ ok: true }, { headers: noStore });
  } catch {
    return json({ error: "No se pudo cerrar la sesión." }, { status: 503, headers: noStore });
  }
};
