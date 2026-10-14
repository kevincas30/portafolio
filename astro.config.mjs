import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  },
  build: { inlineStylesheets: 'auto' },
  security: {
    // CSP via <meta>: Astro hashes every script and <style> it emits, so no 'unsafe-inline' for them.
    // frame-ancestors can't live in a <meta>; it is sent as a header from vercel.json.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "connect-src 'self'",
        "img-src 'self' data:",
        "media-src 'self'",
        "font-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
      ],
      scriptDirective: {
        resources: ["'self'"],
      },
      styleDirective: {
        resources: [
          { resource: "'self'", kind: 'element' },
          // style="" attributes (React style props, CSS custom properties in .astro). They can't run code.
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
});
