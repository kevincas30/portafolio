// Rate limit persistido en Turso (las instancias serverless no comparten memoria).
import { getTurso } from "@/lib/turso";

export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Cuenta un intento y dice si cabe en la ventana. El UPSERT es atomico: reinicia el contador
 * si la ventana vencio y lo incrementa si no. Claves: `panel:{ip}`, `panel:global`, `recovery:{userId}`, `webauthn:{userId}`.
 */
export async function consumeAttempt(
  key: string,
  limit = RATE_LIMIT_MAX,
  windowMs = RATE_LIMIT_WINDOW_MS,
): Promise<RateLimitResult> {
  const database = await getTurso();
  const now = Date.now();
  const result = await database.execute({
    sql: `INSERT INTO login_attempts (key, count, window_expires_at) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN window_expires_at <= ? THEN 1 ELSE count + 1 END,
        window_expires_at = CASE WHEN window_expires_at <= ? THEN ? ELSE window_expires_at END
      RETURNING count, window_expires_at`,
    args: [key, now + windowMs, now, now, now + windowMs],
  });
  const row = result.rows[0];
  const count = Number(row?.count ?? 1);
  const expires = Number(row?.window_expires_at ?? now + windowMs);
  return { allowed: count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((expires - now) / 1000)) };
}

export async function resetAttempts(key: string): Promise<void> {
  const database = await getTurso();
  await database.execute({ sql: "DELETE FROM login_attempts WHERE key = ?", args: [key] });
}
