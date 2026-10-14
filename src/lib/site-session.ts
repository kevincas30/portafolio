import { createDecipheriv, createHash, randomBytes, pbkdf2 } from "node:crypto";
import { promisify } from "node:util";
import { getTurso } from "@/lib/turso";
import type { VaultConfiguration } from "@/types/credential";

export const SESSION_COOKIE = "clientes-panel-session";
export const SESSION_SECONDS = 30 * 60;
export const VAULT_VERIFIER = "clientes-panel-vault:v1";
const deriveKey = promisify(pbkdf2);
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function verifyMasterPassword(password: string, configuration: VaultConfiguration): Promise<boolean> {
  try {
    const key = await deriveKey(password, Buffer.from(configuration.salt, "base64"), configuration.kdfIterations, 32, "sha256");
    const encrypted = Buffer.from(configuration.verifierCiphertext, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(configuration.verifierIv, "base64"));
    decipher.setAuthTag(encrypted.subarray(-16));
    return Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]).toString("utf8") === VAULT_VERIFIER;
  } catch {
    return false;
  }
}

export async function createSiteSession(): Promise<string> {
  const database = await getTurso();
  const token = randomBytes(32).toString("base64url");
  await database.batch([
    { sql: "DELETE FROM site_sessions WHERE expires_at <= ?", args: [Date.now()] },
    { sql: "INSERT INTO site_sessions (token_hash, expires_at) VALUES (?, ?)", args: [tokenHash(token), Date.now() + SESSION_SECONDS * 1000] },
  ], "write");
  return token;
}

export async function hasSiteSession(token: string | undefined): Promise<boolean> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const database = await getTurso();
  const result = await database.execute({ sql: "SELECT token_hash FROM site_sessions WHERE token_hash = ? AND expires_at > ?", args: [tokenHash(token), Date.now()] });
  return result.rows.length === 1;
}

export async function renewSiteSession(token: string): Promise<void> {
  const database = await getTurso();
  await database.execute({ sql: "UPDATE site_sessions SET expires_at = ? WHERE token_hash = ? AND expires_at > ?", args: [Date.now() + SESSION_SECONDS * 1000, tokenHash(token), Date.now()] });
}

export async function deleteSiteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const database = await getTurso();
  await database.execute({ sql: "DELETE FROM site_sessions WHERE token_hash = ?", args: [tokenHash(token)] });
}
