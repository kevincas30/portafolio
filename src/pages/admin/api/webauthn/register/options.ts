import type { APIRoute } from "astro";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { storeChallenge } from "@/lib/server/challenges";
import { fail, ok, readBody } from "@/lib/server/http";
import { consumeAttempt } from "@/lib/server/rate-limit";
import { findUser } from "@/lib/server/vault-users";
import { resolveVaultSession, VAULT_COOKIE } from "@/lib/server/vault-session";
import { getWebAuthnConfig } from "@/lib/server/webauthn-config";
import { SESSION_COOKIE } from "@/lib/site-session";
import { getTurso } from "@/lib/turso";

export const prerender = false;

// Usuario nuevo (pending): basta la sesion de panel que ya exige el middleware.
// Usuario activo (step_up): ademas exige SU sesion de boveda (PA-8).
export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await readBody(request);
  const user = await findUser(body?.userId).catch(() => null);
  if (!user) return fail("Usuario no encontrado.", 404);

  try {
    if (user.status === "active") {
      const sessionUser = await resolveVaultSession(cookies.get(VAULT_COOKIE)?.value, cookies.get(SESSION_COOKIE)?.value);
      if (sessionUser !== user.id) return fail("Desbloquea tu bóveda para añadir una passkey.", 403);
    }

    const limit = await consumeAttempt(`webauthn:${user.id}`);
    if (!limit.allowed) {
      return fail("Demasiados intentos. Espera unos minutos.", 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const config = getWebAuthnConfig();
    const database = await getTurso();
    const existing = await database.execute({
      sql: "SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ?",
      args: [user.id],
    });
    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userName: user.name,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.rows.map((row) => ({
        id: String(row.credential_id),
        transports: String(row.transports) ? String(row.transports).split(",") : undefined,
      })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    });
    const challengeId = await storeChallenge(options.challenge, user.status === "active" ? "step_up" : "register", user.id);
    return ok({ options, challengeId });
  } catch (error) {
    console.error("WebAuthn register options error:", error);
    return fail("No se pudo preparar el registro de la passkey.", 503);
  }
};
