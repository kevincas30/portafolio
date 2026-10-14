// Sesion de boveda: token opaco de 32 bytes, solo se guarda su sha256 y queda atada a la sesion del panel.
import { randomBytes } from "node:crypto";
import { tokenHash } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";

export const VAULT_COOKIE = "vault-user-session";
export const VAULT_SESSION_SECONDS = 15 * 60;
export const vaultCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: import.meta.env.PROD,
  path: "/admin",
  maxAge: VAULT_SESSION_SECONDS,
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Crea la sesion del usuario. Una sola por sesion de panel: cambiar de usuario reemplaza la anterior. */
export async function createVaultSession(userId: string, panelToken: string): Promise<string> {
  const database = await getTurso();
  const token = randomBytes(32).toString("base64url");
  const panelHash = tokenHash(panelToken);
  await database.batch([
    { sql: "DELETE FROM vault_sessions WHERE expires_at <= ? OR panel_token_hash = ?", args: [Date.now(), panelHash] },
    {
      sql: "INSERT INTO vault_sessions (token_hash, user_id, panel_token_hash, expires_at) VALUES (?, ?, ?, ?)",
      args: [tokenHash(token), userId, panelHash, Date.now() + VAULT_SESSION_SECONDS * 1000],
    },
  ], "write");
  return token;
}

/**
 * Resuelve el usuario de la sesion y la renueva (ventana deslizante) en una sola sentencia.
 * Exige que la sesion pertenezca a la sesion de panel actual.
 */
export async function resolveVaultSession(
  token: string | undefined,
  panelToken: string | undefined,
): Promise<string | null> {
  if (!token || !panelToken || !TOKEN_PATTERN.test(token)) return null;
  const database = await getTurso();
  const now = Date.now();
  const result = await database.execute({
    sql: `UPDATE vault_sessions SET expires_at = ?
      WHERE token_hash = ? AND panel_token_hash = ? AND expires_at > ?
      RETURNING user_id`,
    args: [now + VAULT_SESSION_SECONDS * 1000, tokenHash(token), tokenHash(panelToken), now],
  });
  const row = result.rows[0];
  return row ? String(row.user_id) : null;
}

export async function deleteVaultSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const database = await getTurso();
  await database.execute({ sql: "DELETE FROM vault_sessions WHERE token_hash = ?", args: [tokenHash(token)] });
}
