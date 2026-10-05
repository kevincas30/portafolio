import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';
export const GET: APIRoute = async () => {
  if (!site.url) return new Response('Sitemap pendiente: configura PUBLIC_SITE_URL.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  const projects = await getCollection('projects');
  const paths = ['', '/restaurantes', '/alojamientos', '/servicios', '/servicios/diseno-web', '/servicios/diseno-para-redes', '/proyectos', ...projects.map(p => `/proyectos/${p.data.slug}`), '/nosotros', '/contacto'];
  const origin = site.url.replace(/\/$/, '');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
