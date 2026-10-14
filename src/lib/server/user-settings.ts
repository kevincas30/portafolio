import type { SealedInput } from "./credential-input";

/** Upsert del blob cifrado de grupos del usuario. Una fila por usuario, siempre con su user_id. */
export function settingsUpsert(userId: string, sealed: SealedInput) {
  return {
    sql: `INSERT INTO vault_user_settings (user_id, payload, payload_iv, payload_version)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, payload_iv = excluded.payload_iv, updated_at = CURRENT_TIMESTAMP`,
    args: [userId, sealed.payload, sealed.payloadIv],
  };
}

