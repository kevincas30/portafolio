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
}

interface ImportMeta { readonly env: ImportMetaEnv }
