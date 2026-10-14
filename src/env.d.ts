/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly CONTACT_PROVIDER?: 'webhook' | 'disabled';
  readonly CONTACT_WEBHOOK_URL?: string;
  readonly CONTACT_WEBHOOK_TOKEN?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly PUBLIC_WHATSAPP_URL?: string;
  readonly TURSO_DATABASE_URL?: string;
  readonly TURSO_AUTH_TOKEN?: string;
  readonly WEBAUTHN_RP_ID?: string;
  readonly WEBAUTHN_RP_NAME?: string;
  readonly WEBAUTHN_ORIGINS?: string;
}

interface ImportMeta { readonly env: ImportMetaEnv }

declare namespace App {
  interface Locals {
    /** Usuario de la boveda resuelto por el middleware a partir de la sesion de boveda. */
    userId?: string;
  }
}
