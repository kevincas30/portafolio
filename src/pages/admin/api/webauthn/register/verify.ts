import type { APIRoute } from "astro";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { bytesToBase64Url } from "@/lib/vault/encoding";
import { consumeChallenge } from "@/lib/server/challenges";
import { fail, ok, readBody } from "@/lib/server/http";
import { findUser, sha256Hex } from "@/lib/server/vault-users";
import { createVaultSession, resolveVaultSession, VAULT_COOKIE, vaultCookieOptions } from "@/lib/server/vault-session";
import { getWebAuthnConfig } from "@/lib/server/webauthn-config";
import { AUTH_TOKEN_PATTERN, parseWrapper, type WrapperInput } from "@/lib/server/wrapper-input";
import { SESSION_COOKIE } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";

export const prerender = false;

class Conflict extends Error {}

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await readBody(request);
  const user = await findUser(body?.userId).catch(() => null);
  if (!user || !body) return fail("Usuario no encontrado.", 404);
  const panelToken = cookies.get(SESSION_COOKIE)?.value;
  const pending = user.status === "pending";

  try {
    // El step_up exige un desbloqueo reciente al emitir el challenge (options); aca basta la sesion del usuario.
    if (!pending) {
      const sessionUser = await resolveVaultSession(cookies.get(VAULT_COOKIE)?.value, panelToken);
      if (sessionUser !== user.id) return fail("Desbloquea tu bóveda para añadir una passkey.", 403);
    }

    // Forma de lo recibido antes de gastar el challenge verificando la firma.
    const passkeyWrapper = body.passkeyWrapper == null ? null : parseWrapper(body.passkeyWrapper, "passkey");
    if (body.passkeyWrapper != null && !passkeyWrapper) return fail("Wrapper de passkey no válido.", 400);

    let recovery: { wrapper: WrapperInput; authHash: string } | null = null;
    if (pending) {
      const input = body.recovery as { wrapper?: unknown; authToken?: unknown } | undefined;
      const wrapper = input ? parseWrapper(input.wrapper, "recovery") : null;
      if (!wrapper || typeof input?.authToken !== "string" || !AUTH_TOKEN_PATTERN.test(input.authToken)) {
        return fail("Falta el código de recuperación del usuario.", 400);
      }
      if (passkeyWrapper && passkeyWrapper.id === wrapper.id) return fail("Wrappers no válidos.", 400);
      recovery = { wrapper, authHash: sha256Hex(input.authToken) };
    } else if (!passkeyWrapper) {
      // Una passkey sin PRF no aporta nada a un usuario que ya tiene recuperacion.
      return fail("Esta passkey no permite descifrar la bóveda (sin PRF).", 400);
    }

    const challenge = typeof body.challengeId === "string"
      ? await consumeChallenge(body.challengeId, { purpose: pending ? "register" : "step_up", userId: user.id })
      : null;
    if (!challenge) return fail("El desafío caducó o ya se usó. Inténtalo de nuevo.", 400);

    const config = getWebAuthnConfig();
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response as RegistrationResponseJSON,
        expectedChallenge: challenge,
        expectedOrigin: config.origins,
        expectedRPID: config.rpID,
        requireUserVerification: true,
      });
    } catch {
      return fail("No se pudo verificar la passkey.", 400);
    }
    if (!verification.verified) return fail("No se pudo verificar la passkey.", 400);
    const { credential } = verification.registrationInfo;

    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 60) : "Passkey";
    const database = await getTurso();
    const tx = await database.transaction("write");
    try {
      // PA-9: un credentialId ya registrado (de cualquier usuario) se rechaza.
      const duplicate = await tx.execute({ sql: "SELECT 1 FROM webauthn_credentials WHERE credential_id = ?", args: [credential.id] });
      if (duplicate.rows.length > 0) throw new Conflict();

      if (pending && recovery) {
        const activated = await tx.execute({
          sql: "UPDATE vault_users SET status = 'active', recovery_auth_hash = ? WHERE id = ? AND status = 'pending'",
          args: [recovery.authHash, user.id],
        });
        if (activated.rowsAffected !== 1) throw new Conflict();
      }
      await tx.execute({
        sql: `INSERT INTO webauthn_credentials (credential_id, user_id, public_key, counter, transports, prf_capable, label)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [credential.id, user.id, bytesToBase64Url(credential.publicKey), credential.counter, (credential.transports ?? []).join(","), passkeyWrapper ? 1 : 0, label],
      });
      const wrappers: Array<[WrapperInput, "passkey" | "recovery"]> = [];
      if (passkeyWrapper) wrappers.push([passkeyWrapper, "passkey"]);
      if (recovery) wrappers.push([recovery.wrapper, "recovery"]);
      for (const [wrapper, kind] of wrappers) {
        await tx.execute({
          sql: `INSERT INTO vault_key_wrappers
            (id, user_id, kind, webauthn_credential_id, version, kdf, kdf_salt, kdf_iters, iv, wrapped_dek)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
          args: [
            wrapper.id, user.id, kind, kind === "passkey" ? credential.id : null,
            kind === "passkey" ? "hkdf-sha256" : "pbkdf2-sha256",
            wrapper.kdfSalt, wrapper.kdfIters, wrapper.iv, wrapper.wrappedDek,
          ],
        });
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      if (error instanceof Conflict) return fail("No se pudo completar el registro (ya existe).", 409);
      throw error;
    } finally {
      tx.close();
    }

    if (pending && panelToken) {
      cookies.set(VAULT_COOKIE, await createVaultSession(user.id, panelToken), vaultCookieOptions);
    }
    return ok({ ok: true, credentialId: credential.id, prfCapable: Boolean(passkeyWrapper) }, 201);
  } catch (error) {
    console.error("WebAuthn register verify error:", error);
    return fail("No se pudo guardar la passkey.", 503);
  }
};
