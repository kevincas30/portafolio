import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { createSiteSession, deleteSiteSession, hasSiteSession, renewSiteSession, SESSION_COOKIE, SESSION_SECONDS, verifyMasterPassword } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";

export const prerender = false;

const attempts = new Map<string, { count: number; expires: number }>();
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
  const now = Date.now();
  for (const [ip, attempt] of attempts) if (attempt.expires <= now) attempts.delete(ip);
  const attempt = attempts.get(address) ?? { count: 0, expires: now + 15 * 60 * 1000 };
  if (attempt.count >= 10) return json({ error: "Demasiados intentos. Espera unos minutos antes de volver a entrar." }, { status: 429, headers: noStore });

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }
  if (typeof body.password !== "string" || !body.password || body.password.length > 1024) {
    return json({ error: "Escribe la contraseña maestra." }, { status: 400 });
  }

  attempt.count += 1;
  attempts.set(address, attempt);
  try {
    const database = await getTurso();
    const result = await database.execute("SELECT salt, verifier_ciphertext, verifier_iv, kdf_iterations FROM vault_settings WHERE id = 1");
    const row = result.rows[0];
    if (!row || !await verifyMasterPassword(body.password, { salt: String(row.salt), verifierCiphertext: String(row.verifier_ciphertext), verifierIv: String(row.verifier_iv), kdfIterations: Number(row.kdf_iterations) })) {
      return json({ error: "La contraseña maestra no es correcta." }, { status: 401, headers: noStore });
    }
    const token = await createSiteSession();
    await deleteSiteSession(cookies.get(SESSION_COOKIE)?.value);
    attempts.delete(address);
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
