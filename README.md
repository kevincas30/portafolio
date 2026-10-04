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

Todos los proyectos utilizan la misma plantilla editorial. `caseStudy` contiene el resumen y servicios del caso, los títulos, los cinco pasos del proceso y la galería; `challenge`, `approach`, `deliverables` y `outcome` completan el relato. El esquema exige estos datos para que un proyecto nuevo no pueda compilar con una página incompleta.

Los proyectos activos son Italy Pizza, Alojamiento La Rueca y El Tiburón de la Costa, todos con `isDemo: false`. Para añadir otro trabajo real, usa únicamente información y materiales autorizados. La página de portfolio muestra ahora una galería uniforme de dos columnas; las categorías permanecen en los datos para poder recuperar filtros cuando vuelva a haber más de un tipo de proyecto.

### 3. Sustituir imágenes y vídeos

Coloca archivos públicos en una carpeta propia, por ejemplo `public/proyectos/nombre-del-proyecto/`, y actualiza `cover`, `caseStudy.gallery`, `video` o `beforeAfter` en el JSON. Cada medio requiere texto alternativo y pie. Mantén dimensiones estables y exporta imágenes optimizadas; para vídeo, añade poster y evita la carga automática de archivos pesados.

Para un vídeo de portada **solo en «Webs reales» del inicio**, añade `homePreviewVideo: { "src": "/proyectos/archivo.mp4", "alt": "Descripción del recorrido", "poster": "/proyectos/portada-del-video.webp" }` al JSON del proyecto. `poster` es opcional; si falta, utiliza `cover`. Las portadas actuales se extraen de los propios vídeos; `cover` permanece como portada del portfolio y del caso de estudio. Italy Pizza utiliza `italy-home.mp4`; La Rueca utiliza `public/proyectos/La rueca/la-rueca.mp4`. Los originales no se modifican. Ambos vídeos actuales son 16:9: la ventana recorta sus esquinas inferiores sin bandas de relleno e incorpora los tres círculos de macOS. No hay controles nativos ni interacción al pasar el cursor sobre el vídeo; un botón discreto en la barra superior permite reproducir o pausar con ratón, teclado o táctil. Un único coordinador reproduce solo el vídeo visible más cercano al centro de la pantalla. Al cambiar de proyecto, el anterior se pausa, vuelve al inicio y muestra su portada; el siguiente empieza desde cero. Una pausa manual se respeta y una reproducción manual tiene prioridad mientras el vídeo siga visible. La reproducción es silenciosa y se pausa fuera de pantalla o con la pestaña oculta. Con movimiento reducido o ahorro de datos, se conservan las portadas y se puede reproducir manualmente desde ese botón.

#### Galería de cada caso

Los cuatro espacios se configuran juntos en `caseStudy.gallery.items` dentro del JSON de cada proyecto. La primera pieza es horizontal 16:9 y las tres siguientes son verticales 3:4. Coloca sus archivos en la carpeta pública del proyecto; recuerda que una ruta pública comienza por `/proyectos/`, nunca por `/public/`.

- Para una imagen, cambia `type` a `image`, completa `src`, `alt` y `caption`.
- Para un vídeo, cambia `type` a `video`, completa `src`, `poster`, `alt` y `caption`. Se mostrará con controles, `playsinline` y sin precarga ni reproducción automática.
- `fit: 'contain'` conserva una captura de interfaz completa; `fit: 'cover'` llena el marco. `position` acepta valores CSS como `center`, `top` o `50% 20%`.
- Para recuperar el estado pendiente, usa `type: 'placeholder'`. Una ruta vacía nunca genera una petición a un archivo inexistente.

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

## Fondo del hero (ColorBends)

Los ajustes están centralizados en `src/config/hero-background.ts`: `enabled`, `colors`, `speed`, `intensity.light`, `intensity.dark`, `opacity.light`, `opacity.dark`, `mouseInfluence` y `quality` (resolución, pixel ratio, FPS y complejidad por dispositivo). `speed`, `intensity`, `bandWidth`, `scale`, `frequency`, `rotation`, `warpStrength`, `mouseInfluence` y `parallax` corresponden a controles reales del componente original. `opacity`, `accentWeight` y `quality` son controles propios de esta adaptación. La opacidad controla la presencia del fondo en cada tema sin oscurecer sus colores. No hay panel visible.

La isla `src/components/hero/HeroColorBends.tsx` adapta el shader oficial de [ColorBends / React Bits](https://reactbits.dev/backgrounds/color-bends). Solo usa petróleo `#317689` y rosa `#DB2C95`, ocupa todo el hero y se desvanece en sus bordes superior e inferior. Una capa neutra con bordes difuminados protege exclusivamente la zona de lectura, sin recortar el fondo a una columna. Mantiene transparencia en ambos temas y renderizado pausado cuando el hero no está visible o la pestaña está oculta. La preferencia de movimiento reducido evita descargar Three.js y utiliza el fondo estático, también disponible sin JavaScript o ante fallo/pérdida de WebGL. El cambio de tema actualiza los uniformes de la misma instancia.

El aviso de licencia MIT + Commons Clause y atribución de David Haz se conservan en `public/licenses/react-bits.txt` y junto al shader adaptado. El código puede utilizarse dentro de esta web; la licencia no permite revender los componentes como tales. Los tres mockups flotan suavemente mientras la página está arriba, con amplitud reducida en móvil y pausa al bajar, ocultar la pestaña o salir del viewport. Sus desplazamientos por scroll y los del titular siguen reducidos a la mitad. La sección «El problema» conserva su secuencia independiente.

El titular «Dos packs. Un precio claro.» activa una escritura única al entrar en pantalla y conserva un cursor parpadeante al terminar. Se habilita con la propiedad `typewriter` de `SectionHeading`; su velocidad se ajusta en `src/scripts/typewriter-title.ts`. El texto completo permanece renderizado, accesible y con altura estable. Sin JavaScript o con movimiento reducido se muestra completo y sin cursor.

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
