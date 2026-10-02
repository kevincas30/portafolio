# Diseño Creativo

Web comercial y portfolio de un estudio independiente. Está construida con Astro 7, TypeScript, Tailwind CSS 4, React para islas interactivas, GSAP/ScrollTrigger para la coreografía de scroll y Lenis solo en punteros precisos sin movimiento reducido.

## Ejecutar

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

El sitio se genera como HTML estático (`output: 'static'`) con el adaptador `@astrojs/vercel`. Solo `src/pages/api/contact.ts` (`prerender = false`) se despliega como Vercel Function porque el formulario necesita una ruta de servidor. Para otro proveedor de despliegue, sustituye `@astrojs/vercel` por su adaptador oficial y conserva esa ruta como dinámica.

## Editar el sitio

### 1. Textos generales

- Los datos globales están en `src/config/site.ts`.
- Los textos de cada página están en `src/pages/`.
- Los componentes reutilizables viven en `src/components/`.

### Packs, precios y WhatsApp

- WhatsApp, email, packs (`packs`), cuota mensual y precio de lanzamiento (`launchOffer`) están en `src/config/site.ts`. Las tarjetas de precios, las páginas `/restaurantes` y `/alojamientos` y todos los botones de WhatsApp leen de ahí.
- Cuando se cubran las plazas del precio de lanzamiento, pon `launchOffer.enabled` en `false`: anunciar plazas limitadas que ya no lo son engaña al cliente.
- `waLink(texto)` genera un enlace de WhatsApp con el mensaje ya escrito.

### 2. Añadir un proyecto

Duplica uno de los JSON de `src/content/projects/`, cambia `slug` y completa todos los campos. El esquema tipado y validado está en `src/content.config.ts`. Las variantes disponibles son `web`, `social` y `video`. Los bloques opcionales (`testimonial`, `video`, `beforeAfter`, `metrics`, `externalUrl`) desaparecen si no existen.

Los ejemplos actuales son ficticios y llevan `isDemo: true`. Para un trabajo real, usa información autorizada y cambia ese valor a `false`.

### 3. Sustituir imágenes y vídeos

Coloca archivos públicos en `public/visuals/` o en otra carpeta de `public/` y actualiza `cover`, `gallery`, `video` o `beforeAfter` en el JSON. Cada medio requiere texto alternativo y admite un pie opcional. Mantén dimensiones estables y exporta imágenes optimizadas; para vídeo, añade poster y controles, y evita carga automática de archivos pesados.

### 4. Activar testimonios reales

`testimonialsEnabled` está desactivado en `src/config/site.ts`. Añade únicamente testimonios con permiso y datos verificables en el proyecto correspondiente, y activa la opción cuando exista contenido real. La web no publica testimonios inventados.

### 5. Colores y tipografías

Los tokens están al inicio de `src/styles/global.css`: paleta, familias, anchos, radios, capas, duraciones y curvas. Tailwind comparte los tokens principales mediante `@theme`. Space Grotesk, Manrope e IBM Plex Mono se sirven localmente desde los paquetes Fontsource; no dependen de Google Fonts ni de otra petición externa.

### 6. Conectar el formulario

1. Copia `.env.example` a `.env`.
2. Define `CONTACT_PROVIDER=webhook`.
3. Añade `CONTACT_WEBHOOK_URL` y, si corresponde, `CONTACT_WEBHOOK_TOKEN`.
4. Asegúrate de que el endpoint acepte JSON y responda con código 2xx solo al guardar o entregar realmente el mensaje.

El adaptador incluye validación en navegador y servidor, saneado, límites, honeypot, tiempo mínimo de envío, estado de carga y prevención de doble envío. Si falta configuración o el proveedor falla, devuelve un error explícito y no redirige a `/gracias`.

`PUBLIC_CONTACT_EMAIL` y `PUBLIC_WHATSAPP_URL` son opcionales. Si están vacíos no se muestran enlaces falsos.

### 7. Datos legales

`src/pages/aviso-legal.astro` y `src/pages/privacidad.astro` son borradores marcados como tales y excluidos de indexación. Completa identidad, domicilio, fiscalidad, jurisdicción, proveedores, transferencias y plazos con asesoramiento adecuado antes de publicar.

### 8. Dominio y despliegue

Define `PUBLIC_SITE_URL=https://dominio-real.example` sin barra final. Esto activa canonicales, URLs Open Graph y sitemap. Sin dominio, `/sitemap.xml` responde honestamente que está pendiente.

En Vercel, importa el repositorio (preset Astro) y carga las variables de `.env.example` en Settings → Environment Variables; el `.env` local no se sube.

## Accesibilidad y movimiento

- HTML semántico, enlace de salto, foco visible, menú con Escape y gestión de foco.
- Comparador usable con ratón, teclado y táctil.
- Filtros con controles reales y estado reflejado en la URL.
- `prefers-reduced-motion` desactiva Lenis, parallax, escritura y movimientos decorativos.
- GSAP usa un contexto que se revierte en cada navegación de Astro para no acumular listeners o ScrollTriggers.

## Contenido pendiente antes de publicar

- Email, WhatsApp y redes reales.
- Dominio final.
- Proveedor y credenciales del formulario.
- Datos fiscales y revisión jurídica.
- Proyectos, imágenes y testimonios reales autorizados.
