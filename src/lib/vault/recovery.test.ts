import { describe, expect, it } from "vitest";
import { aad, generateDek, unwrapDekBytes, VaultCryptoError, wrapDek } from "./crypto";
import {
  decodeRecoveryCode,
  deriveRecoveryKeys,
  generateRecoveryCode,
  generateRecoverySalt,
  normalizeRecoveryCode,
  RECOVERY_CODE_BYTES,
} from "./recovery";

// Iteraciones bajas para que los tests sean rapidos; el default productivo es 600k.
const ITERS = 1000;

describe("recovery code", () => {
  it("S-VC-6: decodes to >=16 bytes, differs across calls, 8 groups of 4", () => {
    const [a, b] = [generateRecoveryCode(), generateRecoveryCode()];
    expect(a).not.toBe(b);
    expect(a).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(decodeRecoveryCode(a).length).toBe(RECOVERY_CODE_BYTES);
    expect(RECOVERY_CODE_BYTES).toBeGreaterThanOrEqual(16);
  });

  it("S-VC-6: parsing is case, whitespace and dash insensitive", () => {
    const code = generateRecoveryCode();
    const messy = ` ${code.toLowerCase().replace(/-/g, "  ")} `;
    expect(decodeRecoveryCode(messy)).toEqual(decodeRecoveryCode(code));
    expect(normalizeRecoveryCode(messy)).toBe(normalizeRecoveryCode(code));
  });

  it("rejects wrong length or invalid chars", () => {
    expect(() => decodeRecoveryCode("ABCD-EFGH")).toThrow(VaultCryptoError);
    expect(() => decodeRecoveryCode("!".repeat(32))).toThrow(VaultCryptoError);
  });
});

describe("recovery KDF", () => {
  const A = aad.dek("u1", "recovery");

  it("S-VC-3: wrap then unwrap with same code matches; one char changed fails", async () => {
    const code = generateRecoveryCode();
    const salt = generateRecoverySalt();
    const dek = generateDek();
    const wrapped = await wrapDek(dek, (await deriveRecoveryKeys(code, salt, ITERS)).kek, A);

    const again = await deriveRecoveryKeys(code.toLowerCase(), salt, ITERS);
    expect(await unwrapDekBytes(wrapped, again.kek, A)).toEqual(dek);

    const first = code[0] === "0" ? "1" : "0";
    const tampered = await deriveRecoveryKeys(first + code.slice(1), salt, ITERS);
    await expect(unwrapDekBytes(wrapped, tampered.kek, A)).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("authToken is deterministic per (code, salt), 32 bytes base64url, differs with salt", async () => {
    const code = generateRecoveryCode();
    const salt = generateRecoverySalt();
    const a = await deriveRecoveryKeys(code, salt, ITERS);
    const b = await deriveRecoveryKeys(code, salt, ITERS);
    const c = await deriveRecoveryKeys(code, generateRecoverySalt(), ITERS);
    expect(a.authToken).toBe(b.authToken);
    expect(a.authToken).not.toBe(c.authToken);
    expect(a.authToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
