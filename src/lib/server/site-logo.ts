// Logo de un cliente a partir de su web: el servidor lo busca UNA vez y se guarda como data: URL
// (el CSP del panel solo permite imagenes propias o data:). Al pedir URLs que escribio alguien,
// todo pasa por safeFetch para evitar SSRF: solo http(s) en puertos estandar, sin IPs privadas
// (tambien en cada redireccion), con timeout y limite de tamano.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 512 * 1024;
export const MAX_LOGO_BYTES = 200 * 1024;
const MAX_ATTEMPTS = 3;
const IMAGE_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon",
]);

export class LogoError extends Error {}

function ipv4Parts(address: string): number[] {
  return address.split(".").map(Number);
}

/** true solo para direcciones enrutables en internet (nada de loopback, privadas, link-local, CGNAT, etc.). */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = ipv4Parts(address);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (version === 6) {
    const value = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
    if (mapped) return isPublicAddress(mapped[1]);
    if (value === "::" || value === "::1") return false;
    if (/^f[cd]/.test(value) || /^fe[89ab]/.test(value) || /^ff/.test(value)) return false;
    return true;
  }
  return false;
}

function attribute(tag: string, name: string): string {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function iconScore(rel: string, sizes: string, type: string, href: string): number {
  const isSvg = type.includes("svg") || /\.svg(\?|$)/i.test(href);
  const isIco = type.includes("icon") || /\.ico(\?|$)/i.test(href);
  const size = Math.max(0, ...sizes.split(/\s+/).map((item) => Number(item.split("x")[0]) || 0));
  if (rel.includes("apple-touch-icon")) return 1000 + (size || 180);
  if (isSvg) return 800;
  if (isIco) return 10 + size;
  return 100 + (size || 32);
}

/** URLs de iconos declarados en el HTML, de la mejor a la peor, con /favicon.ico como ultimo recurso. */
export function iconCandidates(html: string, pageUrl: string): string[] {
  const found: Array<{ url: string; score: number }> = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attribute(tag, "rel").toLowerCase();
    if (!/(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed)(\s|$)/.test(rel)) continue;
    const href = attribute(tag, "href");
    if (!href || href.startsWith("data:")) continue;
    try {
      const url = new URL(href, pageUrl).toString();
      found.push({ url, score: iconScore(rel, attribute(tag, "sizes"), attribute(tag, "type").toLowerCase(), href) });
    } catch {
      // href invalido: se ignora.
    }
  }
  const urls = found.sort((a, b) => b.score - a.score).map((item) => item.url);
  const fallback = new URL("/favicon.ico", pageUrl).toString();
  return [...new Set([...urls, fallback])];
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new LogoError("Solo se admiten webs http o https.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new LogoError("Puerto no permitido.");
  if (url.username || url.password) throw new LogoError("URL no permitida.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || !addresses.every((entry) => isPublicAddress(entry.address))) {
    throw new LogoError("La web apunta a una dirección no permitida.");
  }
}

async function readLimited(response: Response, maxBytes: number, truncate: boolean): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      if (!truncate) throw new LogoError("La imagen es demasiado grande.");
      chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
      break;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** fetch que revalida cada salto de redireccion contra assertPublicUrl. */
async function safeFetch(rawUrl: string, accept: string): Promise<{ response: Response; url: string }> {
  let url = new URL(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: accept, "User-Agent": "DisenoCreativoPanel/1.0 (+https://www.discreativo.com)" },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    return { response, url: url.toString() };
  }
  throw new LogoError("Demasiadas redirecciones.");
}

async function fetchImage(url: string): Promise<string> {
  const { response } = await safeFetch(url, "image/*");
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!response.ok || !IMAGE_TYPES.has(type)) {
    await response.body?.cancel();
    throw new LogoError("No es una imagen válida.");
  }
  const bytes = await readLimited(response, MAX_LOGO_BYTES, false);
  if (bytes.byteLength === 0) throw new LogoError("La imagen está vacía.");
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** Busca el logo de una web y lo devuelve como data: URL. Lanza LogoError con un mensaje para el usuario. */
export async function fetchSiteLogo(websiteUrl: string): Promise<string> {
  let candidates: string[];
  try {
    const { response, url } = await safeFetch(websiteUrl, "text/html");
    const html = response.ok ? new TextDecoder().decode(await readLimited(response, MAX_HTML_BYTES, true)) : "";
    candidates = iconCandidates(html, url);
  } catch (error) {
    if (error instanceof LogoError) throw error;
    throw new LogoError("No se pudo abrir la web del cliente.");
  }

  for (const candidate of candidates.slice(0, MAX_ATTEMPTS)) {
    try {
      return await fetchImage(candidate);
    } catch {
      // Se prueba el siguiente candidato.
    }
  }
  throw new LogoError("No se encontró un logo en la web del cliente.");
}
