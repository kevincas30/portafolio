import type { APIRoute } from "astro";
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { base64UrlToBytes } from "@/lib/vault/encoding";
import { consumeChallenge } from "@/lib/server/challenges";
import { fail, ok, readBody } from "@/lib/server/http";
import { consumeAttempt, resetAttempts } from "@/lib/server/rate-limit";
import { findUser, toWrapperRow } from "@/lib/server/vault-users";
import { createVaultSession, VAULT_COOKIE, vaultCookieOptions } from "@/lib/server/vault-session";
import { getWebAuthnConfig } from "@/lib/server/webauthn-config";
import { SESSION_COOKIE } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";

export const prerender = false;

const GENERIC_FAILURE = "No se pudo verificar la passkey.";

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await readBody(request);
  const panelToken = cookies.get(SESSION_COOKIE)?.value;
  if (!body || !panelToken) return fail(GENERIC_FAILURE, 400);

  try {
    const user = await findUser(body.userId);
    if (!user || user.status !== "active") return fail(GENERIC_FAILURE, 400);

    const limit = await consumeAttempt(`webauthn:${user.id}`);
    if (!limit.allowed) {
      return fail("Demasiados intentos. Espera unos minutos.", 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const challenge = typeof body.challengeId === "string"
      ? await consumeChallenge(body.challengeId, { purpose: "authenticate", userId: user.id })
      : null;
    if (!challenge) return fail("El desafío caducó o ya se usó. Inténtalo de nuevo.", 400);

    const response = body.response as AuthenticationResponseJSON;
    const database = await getTurso();
    // La credencial debe ser de ESTE usuario: una passkey ajena no sirve (S-PA-5).
    const stored = await database.execute({
      sql: "SELECT credential_id, public_key, counter, transports FROM webauthn_credentials WHERE credential_id = ? AND user_id = ?",
      args: [typeof response?.id === "string" ? response.id : "", user.id],
    });
    const row = stored.rows[0];
    if (!row) return fail(GENERIC_FAILURE, 400);

    const config = getWebAuthnConfig();
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: config.origins,
        expectedRPID: config.rpID,
        requireUserVerification: true,
        credential: {
          id: String(row.credential_id),
          publicKey: base64UrlToBytes(String(row.public_key)),
          counter: Number(row.counter),
          transports: String(row.transports) ? (String(row.transports).split(",") as AuthenticatorTransport[]) : undefined,
        },
      });
    } catch {
      // Incluye origen/rpID incorrectos y contador que no avanza (PA-7).
      return fail(GENERIC_FAILURE, 400);
    }
    if (!verification.verified) return fail(GENERIC_FAILURE, 400);

    // Actualizacion condicional al contador leido: un replay concurrente no pasa dos veces.
    const updated = await database.execute({
      sql: "UPDATE webauthn_credentials SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE credential_id = ? AND counter = ?",
      args: [verification.authenticationInfo.newCounter, String(row.credential_id), Number(row.counter)],
    });
    if (updated.rowsAffected !== 1) return fail(GENERIC_FAILURE, 400);

    await resetAttempts(`webauthn:${user.id}`);
    cookies.set(VAULT_COOKIE, await createVaultSession(user.id, panelToken), vaultCookieOptions);

    const wrapper = await database.execute({
      sql: "SELECT id, kdf_salt, kdf_iters, iv, wrapped_dek FROM vault_key_wrappers WHERE webauthn_credential_id = ? AND user_id = ?",
      args: [String(row.credential_id), user.id],
    });
    return ok({ userId: user.id, wrapper: wrapper.rows[0] ? toWrapperRow(wrapper.rows[0]) : null });
  } catch (error) {
    console.error("WebAuthn authenticate verify error:", error);
    return fail("No se pudo desbloquear con la passkey.", 503);
  }
};
