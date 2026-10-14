import { createHash, timingSafeEqual } from "node:crypto";

/** Compara dos strings en tiempo constante: se normalizan a sha256 para que el largo no filtre nada. */
export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
