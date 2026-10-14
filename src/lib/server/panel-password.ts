// Hash scrypt de la contrasena del panel. Formato: scrypt$N$r$p$salt$hash (salt y hash en base64).
import { randomBytes, scrypt, type ScryptOptions } from "node:crypto";
import { safeEqual } from "@/lib/server/constant-time";

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPanelPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, { N, r: R, p: P, maxmem: MAX_MEMORY });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

/** Devuelve false ante cualquier hash mal formado o con parametros fuera de rango (nunca lanza). */
export async function verifyPanelPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const params = { N: Number(n), r: Number(r), p: Number(p) };
    // Se acotan los parametros para que un valor corrupto no pueda disparar un coste enorme.
    if (!Number.isInteger(params.N) || params.N < 2 ** 14 || params.N > 2 ** 16 || (params.N & (params.N - 1)) !== 0) return false;
    if (!Number.isInteger(params.r) || params.r < 1 || params.r > 16) return false;
    if (!Number.isInteger(params.p) || params.p < 1 || params.p > 4) return false;
    const expected = Buffer.from(hash, "base64");
    if (expected.length !== KEY_LENGTH) return false;
    const key = await derive(password, Buffer.from(salt, "base64"), { ...params, maxmem: MAX_MEMORY });
    return safeEqual(key.toString("base64"), expected.toString("base64"));
  } catch {
    return false;
  }
}
