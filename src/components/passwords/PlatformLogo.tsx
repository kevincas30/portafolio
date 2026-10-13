import { useState } from "react";
import { Globe2 } from "lucide-react";
import {
  siFacebook,
  siGithub,
  siGmail,
  siGoogle,
  siHostinger,
  siInstagram,
  siPayoneer,
  siShopify,
  siTiktok,
  siTurso,
  siVercel,
} from "simple-icons";
import { getCredentialAppearance } from "@/config/credential-platforms";

interface SimpleIconData {
  title: string;
  path: string;
  hex: string;
}

const vectorLogos: Record<string, SimpleIconData> = {
  facebook: siFacebook,
  github: siGithub,
  gmail: siGmail,
  google: siGoogle,
  hostinger: siHostinger,
  instagram: siInstagram,
  payoneer: siPayoneer,
  shopify: siShopify,
  tiktok: siTiktok,
  turso: siTurso,
  vercel: siVercel,
};

const faviconDomains: Record<string, string> = {
  amazon: "amazon.com",
  hotmart: "hotmart.com",
  sumup: "sumup.com",
  wallapop: "wallapop.com",
};

function domainFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.hostname : null;
  } catch {
    return null;
  }
}

interface PlatformLogoProps {
  name: string;
  platform: string;
  url: string;
  compact?: boolean;
}

export function PlatformLogo({ name, platform, url, compact = false }: PlatformLogoProps) {
  const appearance = getCredentialAppearance(name, platform);
  const vectorLogo = appearance.key ? vectorLogos[appearance.key] : null;
  const domain = (appearance.key && faviconDomains[appearance.key]) || domainFromUrl(url);
  const [failedDomain, setFailedDomain] = useState<string | null>(null);
  const imageFailed = Boolean(domain && failedDomain === domain);

  return (
    <span
      className={`relative grid shrink-0 place-items-center ${compact ? "size-7" : "size-8"}`}
      style={{ color: appearance.accent }}
    >
      {vectorLogo ? (
        <svg
          viewBox="0 0 24 24"
          aria-label={`Logo de ${vectorLogo.title}`}
          className={compact ? "size-[18px]" : "size-[22px]"}
          fill={`#${vectorLogo.hex}`}
        >
          <path d={vectorLogo.path} />
        </svg>
      ) : domain && !imageFailed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
          alt={`Logo de ${platform || name}`}
          className="size-full object-contain mix-blend-multiply p-1"
          onError={() => setFailedDomain(domain)}
        />
      ) : (
        <Globe2 aria-label={`Icono de ${platform || name}`} className={compact ? "size-[18px]" : "size-[22px]"} />
      )}
    </span>
  );
}
