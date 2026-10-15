import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { consumeAttempt } from "@/lib/server/rate-limit";
import { fetchSiteLogo, LogoError } from "@/lib/server/site-logo";
import { getTurso } from "@/lib/turso";

export const prerender = false;

// Tope global: el endpoint hace pedidos salientes, que no sirva de proxy para martillar webs ajenas.
const LIMIT_KEY = "logo:global";
const LIMIT = 30;

// Busca el logo en la web GUARDADA del cliente (nunca en una URL que venga en el body) y lo guarda.
export const POST: APIRoute = async ({ request }) => {
  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !body.id || body.id.length > 128) {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }

  try {
    const limit = await consumeAttempt(LIMIT_KEY, LIMIT);
    if (!limit.allowed) {
      return json({ error: "Demasiadas búsquedas de logos. Espera unos minutos." }, { status: 429, headers: { ...noStore, "Retry-After": String(limit.retryAfterSeconds) } });
    }

    const database = await getTurso();
    const result = await database.execute({ sql: "SELECT website_url FROM clients WHERE id = ?", args: [body.id] });
    const row = result.rows[0];
    if (!row) return json({ error: "El cliente no existe." }, { status: 404 });
    const websiteUrl = String(row.website_url ?? "");
    if (!websiteUrl) return json({ error: "El cliente no tiene web cargada." }, { status: 400 });

    let logo: string;
    try {
      logo = await fetchSiteLogo(websiteUrl);
    } catch (error) {
      const message = error instanceof LogoError ? error.message : "No se pudo obtener el logo.";
      return json({ error: message }, { status: 422, headers: noStore });
    }

    // Solo se guarda si la web no cambio mientras se buscaba.
    await database.execute({ sql: "UPDATE clients SET logo = ? WHERE id = ? AND website_url = ?", args: [logo, body.id, websiteUrl] });
    return json({ logo }, { headers: noStore });
  } catch (error) {
    console.error("Client logo error:", error);
    return json({ error: "No se pudo obtener el logo." }, { status: 503 });
  }
};
