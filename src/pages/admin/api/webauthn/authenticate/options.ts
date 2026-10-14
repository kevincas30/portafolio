import type { APIRoute } from "astro";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { storeChallenge } from "@/lib/server/challenges";
import { fail, ok, readBody } from "@/lib/server/http";
import { consumeAttempt } from "@/lib/server/rate-limit";
import { findUser } from "@/lib/server/vault-users";
import { getWebAuthnConfig } from "@/lib/server/webauthn-config";
import { getTurso } from "@/lib/turso";

export const prerender = false;

// allowCredentials contiene solo las passkeys del usuario pedido (PA-3).
export const POST: APIRoute = async ({ request }) => {
  const body = await readBody(request);
  try {
    const user = await findUser(body?.userId);
    if (!user || user.status !== "active") return fail("Usuario no encontrado.", 404);

    const limit = await consumeAttempt(`webauthn:${user.id}`);
    if (!limit.allowed) {
      return fail("Demasiados intentos. Espera unos minutos.", 429, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    const database = await getTurso();
    const credentials = await database.execute({
      sql: "SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ?",
      args: [user.id],
    });
    if (credentials.rows.length === 0) return fail("Este usuario no tiene passkeys.", 404);

    const config = getWebAuthnConfig();
    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      userVerification: "required",
      allowCredentials: credentials.rows.map((row) => ({
        id: String(row.credential_id),
        transports: String(row.transports) ? (String(row.transports).split(",") as AuthenticatorTransport[]) : undefined,
      })),
    });
    const challengeId = await storeChallenge(options.challenge, "authenticate", user.id);
    return ok({ options, challengeId });
  } catch (error) {
    console.error("WebAuthn authenticate options error:", error);
    return fail("No se pudo preparar el desbloqueo con passkey.", 503);
  }
};
