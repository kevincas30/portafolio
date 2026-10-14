// Challenges de WebAuthn en Turso: un solo uso (DELETE ... RETURNING atomico) y 5 minutos de vida.
import { randomUUID } from "node:crypto";
import { getTurso } from "@/lib/turso";

export type ChallengePurpose = "register" | "authenticate" | "step_up";

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface ChallengeRow {
  challenge: string;
  userId: string | null;
  purpose: string;
  expiresAt: number;
}

/** Valida una fila ya consumida: vigente, mismo proposito y mismo usuario. */
export function evaluateChallenge(
  row: ChallengeRow | null,
  expected: { purpose: ChallengePurpose; userId: string | null },
  now: number,
): string | null {
  if (!row) return null;
  if (row.expiresAt <= now) return null;
  if (row.purpose !== expected.purpose) return null;
  if (row.userId !== expected.userId) return null;
  return row.challenge;
}

export async function storeChallenge(
  challenge: string,
  purpose: ChallengePurpose,
  userId: string | null,
): Promise<string> {
  const database = await getTurso();
  const id = randomUUID();
  const now = Date.now();
  await database.batch([
    { sql: "DELETE FROM webauthn_challenges WHERE expires_at <= ?", args: [now] },
    {
      sql: "INSERT INTO webauthn_challenges (id, user_id, purpose, challenge, expires_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, userId, purpose, challenge, now + CHALLENGE_TTL_MS],
    },
  ], "write");
  return id;
}

/**
 * Consume el challenge: la fila se borra en el primer intento (exito o fallo, incluso con
 * proposito equivocado), asi que un replay siempre encuentra la fila ausente.
 * Devuelve el challenge o null si no existe, expiro o no coincide.
 */
export async function consumeChallenge(
  id: string,
  expected: { purpose: ChallengePurpose; userId: string | null },
): Promise<string | null> {
  const database = await getTurso();
  const result = await database.execute({
    sql: "DELETE FROM webauthn_challenges WHERE id = ? RETURNING challenge, user_id, purpose, expires_at",
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;
  return evaluateChallenge(
    {
      challenge: String(row.challenge),
      userId: row.user_id === null ? null : String(row.user_id),
      purpose: String(row.purpose),
      expiresAt: Number(row.expires_at),
    },
    expected,
    Date.now(),
  );
}
