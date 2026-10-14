// Contrasena del panel: hash scrypt en `panel_auth`. Mientras exista el verifier legacy en `vault_settings`
// (se retira en 4.6) se acepta como respaldo y, al primer login correcto, se migra a scrypt.
import { verifyMasterPassword } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";
import { hashPanelPassword, verifyPanelPassword } from "@/lib/server/panel-password";

export async function isPanelConfigured(): Promise<boolean> {
  const database = await getTurso();
  const result = await database.execute(
    "SELECT (SELECT COUNT(*) FROM panel_auth WHERE id = 1) AS panel, (SELECT COUNT(*) FROM vault_settings WHERE id = 1) AS legacy",
  );
  const row = result.rows[0];
  return Number(row?.panel ?? 0) > 0 || Number(row?.legacy ?? 0) > 0;
}

async function storePanelHash(password: string): Promise<boolean> {
  const database = await getTurso();
  const result = await database.execute({
    sql: "INSERT OR IGNORE INTO panel_auth (id, password_hash) VALUES (1, ?)",
    args: [await hashPanelPassword(password)],
  });
  return result.rowsAffected > 0;
}

/** Crea la contrasena solo si no hay ninguna (ni scrypt ni legacy). false = ya estaba configurado. */
export async function setupPanelPassword(password: string): Promise<boolean> {
  if (await isPanelConfigured()) return false;
  return storePanelHash(password);
}

export async function verifyPanelLogin(password: string): Promise<boolean> {
  const database = await getTurso();
  const stored = await database.execute("SELECT password_hash FROM panel_auth WHERE id = 1");
  const hash = stored.rows[0]?.password_hash;
  if (typeof hash === "string") return verifyPanelPassword(password, hash);

  // Respaldo legacy: aun no hay scrypt, se valida contra el verifier y se guarda el hash del mismo password.
  const legacy = await database.execute("SELECT salt, verifier_ciphertext, verifier_iv, kdf_iterations FROM vault_settings WHERE id = 1");
  const row = legacy.rows[0];
  if (!row) return false;
  const valid = await verifyMasterPassword(password, {
    salt: String(row.salt),
    verifierCiphertext: String(row.verifier_ciphertext),
    verifierIv: String(row.verifier_iv),
    kdfIterations: Number(row.kdf_iterations),
  });
  if (valid) {
    try {
      await storePanelHash(password);
    } catch (error) {
      // No bloquea el acceso: se reintentara en el siguiente login.
      console.error("Panel password upgrade failed:", error);
    }
  }
  return valid;
}
