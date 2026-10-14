import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { getTurso, TursoConfigurationError } from "@/lib/turso";
import { isPanelConfigured, setupPanelPassword } from "@/lib/server/panel-auth";

export const prerender = false;

function databaseError(error: unknown) {
  const message = error instanceof TursoConfigurationError
    ? "Turso no está configurado."
    : "No se pudo acceder al panel.";
  if (!(error instanceof TursoConfigurationError)) console.error("Vault database error:", error);
  return json({ error: message }, { status: 503 });
}

export const GET: APIRoute = async () => {
  try {
    const database = await getTurso();
    const result = await database.execute(`
      SELECT salt, verifier_ciphertext, verifier_iv, kdf_iterations
      FROM vault_settings WHERE id = 1
    `);
    const row = result.rows[0];
    const configuration = row ? {
      salt: String(row.salt),
      verifierCiphertext: String(row.verifier_ciphertext),
      verifierIv: String(row.verifier_iv),
      kdfIterations: Number(row.kdf_iterations),
    } : null;
    // `configuration` (salt/verifier legacy) se elimina en 4.6, cuando panel_auth ya exista.
    return json({ configured: await isPanelConfigured(), configuration }, { headers: noStore });
  } catch (error) {
    return databaseError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Configuración no válida." }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password.length < 10 || body.password.length > 1024) {
    return json({ error: "Usa una contraseña de al menos 10 caracteres." }, { status: 400 });
  }

  try {
    if (!await setupPanelPassword(body.password)) {
      return json({ error: "El panel ya está configurado." }, { status: 409 });
    }
    return json({ ok: true }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
};
