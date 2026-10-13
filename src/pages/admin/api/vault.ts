import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { getTurso, TursoConfigurationError } from "@/lib/turso";
import type { VaultConfiguration } from "@/types/credential";

export const prerender = false;

function databaseError(error: unknown) {
  const message = error instanceof TursoConfigurationError
    ? "Turso no está configurado."
    : "No se pudo acceder al panel.";
  if (!(error instanceof TursoConfigurationError)) console.error("Vault database error:", error);
  return json({ error: message }, { status: 503 });
}

function isConfiguration(value: unknown): value is VaultConfiguration {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<VaultConfiguration>;
  return (
    typeof config.salt === "string" && config.salt.length <= 256 &&
    typeof config.verifierCiphertext === "string" && config.verifierCiphertext.length <= 1024 &&
    typeof config.verifierIv === "string" && config.verifierIv.length <= 256 &&
    typeof config.kdfIterations === "number" &&
    config.kdfIterations >= 100_000 && config.kdfIterations <= 2_000_000
  );
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
    return json({ configuration }, { headers: noStore });
  } catch (error) {
    return databaseError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Configuración no válida." }, { status: 400 });
  }

  if (!isConfiguration(body)) {
    return json({ error: "Configuración no válida." }, { status: 400 });
  }

  try {
    const database = await getTurso();
    const existing = await database.execute("SELECT id FROM vault_settings WHERE id = 1");
    if (existing.rows.length > 0) {
      return json({ error: "El panel ya está configurado." }, { status: 409 });
    }

    await database.execute({
      sql: `INSERT INTO vault_settings
        (id, salt, verifier_ciphertext, verifier_iv, kdf_iterations)
        VALUES (1, ?, ?, ?, ?)`,
      args: [body.salt, body.verifierCiphertext, body.verifierIv, body.kdfIterations],
    });
    return json({ ok: true }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
};
