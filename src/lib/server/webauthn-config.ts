// Configuracion de WebAuthn (solo servidor). En dev cae a localhost; en produccion exige las variables.
export interface WebAuthnConfig {
  rpID: string;
  rpName: string;
  origins: string[];
}

export class WebAuthnConfigError extends Error {
  constructor() {
    super("WebAuthn no está configurado (WEBAUTHN_RP_ID y WEBAUTHN_ORIGINS)");
    this.name = "WebAuthnConfigError";
  }
}

interface WebAuthnEnv {
  WEBAUTHN_RP_ID?: string;
  WEBAUTHN_RP_NAME?: string;
  WEBAUTHN_ORIGINS?: string;
}

const DEV_RP_ID = "localhost";
const DEV_ORIGIN = "http://localhost:4321";
const DEFAULT_RP_NAME = "Panel privado";

export function resolveWebAuthnConfig(env: WebAuthnEnv, isDev: boolean): WebAuthnConfig {
  const rpID = env.WEBAUTHN_RP_ID?.trim() || (isDev ? DEV_RP_ID : "");
  const origins = (env.WEBAUTHN_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (isDev && origins.length === 0) origins.push(DEV_ORIGIN);
  if (!rpID || origins.length === 0) throw new WebAuthnConfigError();
  return { rpID, rpName: env.WEBAUTHN_RP_NAME?.trim() || DEFAULT_RP_NAME, origins };
}

export function getWebAuthnConfig(): WebAuthnConfig {
  return resolveWebAuthnConfig(import.meta.env, import.meta.env.DEV);
}
