import type { CredentialProvider } from "@/types/credential";

export const GMAIL_INBOX_URL = "https://mail.google.com/mail/u/0/";

interface CredentialAppearance {
  key: string | null;
  accent: string;
  soft: string;
}

const appearances: Record<string, CredentialAppearance> = {
  google: { key: "google", accent: "#4285f4", soft: "#edf4ff" },
  gmail: { key: "gmail", accent: "#d84b40", soft: "#fff0ee" },
  instagram: { key: "instagram", accent: "#b33c80", soft: "#fceef6" },
  vercel: { key: "vercel", accent: "#241c18", soft: "#f0ece9" },
  sumup: { key: "sumup", accent: "#1b8269", soft: "#e9f7f2" },
  payoneer: { key: "payoneer", accent: "#d55525", soft: "#fff0e8" },
  hotmart: { key: "hotmart", accent: "#e35d32", soft: "#fff0ea" },
  amazon: { key: "amazon", accent: "#c57914", soft: "#fff4df" },
  tiktok: { key: "tiktok", accent: "#251d19", soft: "#f0ece9" },
  facebook: { key: "facebook", accent: "#2877d4", soft: "#edf5ff" },
  github: { key: "github", accent: "#332922", soft: "#f0ece9" },
  hostinger: { key: "hostinger", accent: "#673de6", soft: "#f1edff" },
  turso: { key: "turso", accent: "#1f6f61", soft: "#e8f8f4" },
  shopify: { key: "shopify", accent: "#7ab55c", soft: "#eef7e9" },
  wallapop: { key: "wallapop", accent: "#13c1ac", soft: "#e7f8f6" },
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

export function getCredentialAppearance(name: string, platform: string): CredentialAppearance {
  const searchable = `${normalize(platform)} ${normalize(name)}`;
  const match = Object.keys(appearances).find((key) => searchable.includes(key));
  if (match) return appearances[match];

  return {
    key: null,
    accent: "#b83f27",
    soft: "#fdece6",
  };
}

export function inferCredentialProvider(platform: string, url: string): CredentialProvider {
  const normalizedPlatform = normalize(platform).replace(/\s+/g, " ");
  const googlePlatforms = new Set([
    "google",
    "gmail",
    "google / gmail",
    "google/gmail",
    "cuenta google",
    "google workspace",
  ]);

  if (googlePlatforms.has(normalizedPlatform)) return "google";

  try {
    const hostname = new URL(url).hostname.toLocaleLowerCase("es");
    if (hostname === "google.com" || hostname.endsWith(".google.com")) return "google";
  } catch {
    // Una URL incompleta no debe impedir guardar el formulario.
  }

  return null;
}

export function isWebsitePlatform(platform: string): boolean {
  const normalizedPlatform = normalize(platform)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");

  return new Set(["web", "pagina", "pagina web", "sitio web", "website"]).has(normalizedPlatform);
}

const socialPlatformTerms = [
  "instagram",
  "tiktok",
  "facebook",
  "twitter",
  "youtube",
  "threads",
  "linkedin",
  "pinterest",
  "snapchat",
  "twitch",
  "discord",
  "reddit",
  "telegram",
  "whatsapp",
  "bluesky",
  "mastodon",
  "behance",
  "vimeo",
  "kick",
];

export function isSocialCredential(name: string, platform: string, url: string): boolean {
  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLocaleLowerCase("es");
  } catch {
    // El nombre y la plataforma siguen permitiendo detectar la red social.
  }

  const normalizedName = normalize(name);
  const normalizedPlatform = normalize(platform);
  const searchable = `${normalizedName} ${normalizedPlatform} ${hostname}`;

  if (normalizedName === "x" || normalizedPlatform === "x" || hostname === "x.com" || hostname.endsWith(".x.com")) {
    return true;
  }

  return socialPlatformTerms.some((term) => searchable.includes(term));
}
