// Sesion de boveda: token opaco de 32 bytes, solo se guarda su sha256 y queda atada a la sesion del panel.
import { randomBytes } from "node:crypto";
import { tokenHash } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";

export const VAULT_COOKIE = "vault-user-session";
export const VAULT_SESSION_SECONDS = 15 * 60;
/** Ventana para acciones sensibles (agregar passkey): exige haber desbloqueado hace poco. */
export const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;
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
  const now = Date.now();
  await database.batch([
    { sql: "DELETE FROM vault_sessions WHERE expires_at <= ? OR panel_token_hash = ?", args: [now, panelHash] },
    {
      sql: "INSERT INTO vault_sessions (token_hash, user_id, panel_token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [tokenHash(token), userId, panelHash, now + VAULT_SESSION_SECONDS * 1000, now],
    },
  ], "write");
  return token;
}

export interface VaultSessionInfo {
  userId: string;
  createdAt: number;
}

/** true si la sesion nacio de un desbloqueo hecho dentro de la ventana de step-up. */
export function isFreshUnlock(createdAt: number, now: number, maxAgeMs = STEP_UP_MAX_AGE_MS): boolean {
  return createdAt > 0 && createdAt <= now && now - createdAt <= maxAgeMs;
}

/**
 * Resuelve la sesion y la renueva (ventana deslizante) en una sola sentencia.
 * Exige que la sesion pertenezca a la sesion de panel actual.
 */
export async function resolveVaultSessionInfo(
  token: string | undefined,
  panelToken: string | undefined,
): Promise<VaultSessionInfo | null> {
  if (!token || !panelToken || !TOKEN_PATTERN.test(token)) return null;
  const database = await getTurso();
  const now = Date.now();
  const result = await database.execute({
    sql: `UPDATE vault_sessions SET expires_at = ?
      WHERE token_hash = ? AND panel_token_hash = ? AND expires_at > ?
      RETURNING user_id, created_at`,
    args: [now + VAULT_SESSION_SECONDS * 1000, tokenHash(token), tokenHash(panelToken), now],
  });
  const row = result.rows[0];
  return row ? { userId: String(row.user_id), createdAt: Number(row.created_at) } : null;
}

export async function resolveVaultSession(
  token: string | undefined,
  panelToken: string | undefined,
): Promise<string | null> {
  return (await resolveVaultSessionInfo(token, panelToken))?.userId ?? null;
}

export async function deleteVaultSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const database = await getTurso();
  await database.execute({ sql: "DELETE FROM vault_sessions WHERE token_hash = ?", args: [tokenHash(token)] });
}
