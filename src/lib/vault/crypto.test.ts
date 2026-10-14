import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "./encoding";
import {
  aad,
  decryptJson,
  deriveKekFromPrf,
  encryptJson,
  generateDek,
  getPrfSalt,
  importDek,
  unwrapDek,
  unwrapDekBytes,
  VaultCryptoError,
  wrapDek,
  randomBytes,
} from "./crypto";

const A = aad.dek("u1", "w1");

describe("DEK wrap/unwrap", () => {
  it("S-VC-1: wrap then unwrap returns the same DEK bytes", async () => {
    const dek = generateDek();
    const kek = await deriveKekFromPrf(randomBytes(32), randomBytes(32));
    const wrapped = await wrapDek(dek, kek, A);
    expect(await unwrapDekBytes(wrapped, kek, A)).toEqual(dek);
  });

  it("S-VC-2: unwrap with a different PRF output throws a typed error", async () => {
    const salt = randomBytes(32);
    const wrapped = await wrapDek(generateDek(), await deriveKekFromPrf(randomBytes(32), salt), A);
    const wrong = await deriveKekFromPrf(randomBytes(32), salt);
    await expect(unwrapDekBytes(wrapped, wrong, A)).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("same PRF + same salt derives the same KEK; different salt does not", async () => {
    const prf = randomBytes(32);
    const salt = randomBytes(32);
    const wrapped = await wrapDek(generateDek(), await deriveKekFromPrf(prf, salt), A);
    await expect(unwrapDekBytes(wrapped, await deriveKekFromPrf(prf, salt), A)).resolves.toBeDefined();
    await expect(
      unwrapDekBytes(wrapped, await deriveKekFromPrf(prf, randomBytes(32)), A),
    ).rejects.toThrow(VaultCryptoError);
  });

  it("AAD mismatch (wrapper swapped to another user) fails", async () => {
    const kek = await deriveKekFromPrf(randomBytes(32), randomBytes(32));
    const wrapped = await wrapDek(generateDek(), kek, aad.dek("u1", "w1"));
    await expect(unwrapDekBytes(wrapped, kek, aad.dek("u2", "w1"))).rejects.toThrow(VaultCryptoError);
  });

  it("each wrap uses a fresh IV", async () => {
    const dek = generateDek();
    const kek = await deriveKekFromPrf(randomBytes(32), randomBytes(32));
    const [a, b] = [await wrapDek(dek, kek, A), await wrapDek(dek, kek, A)];
    expect(a.iv).not.toBe(b.iv);
  });

  it("S-VC-8: unwrapped DEK is non-extractable", async () => {
    const kek = await deriveKekFromPrf(randomBytes(32), randomBytes(32));
    const key = await unwrapDek(await wrapDek(generateDek(), kek, A), kek, A);
    expect(key.extractable).toBe(false);
    await expect(globalThis.crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });

  it("PRF salt is a fixed 32-byte SHA-256", async () => {
    const [a, b] = [await getPrfSalt(), await getPrfSalt()];
    expect(a).toHaveLength(32);
    expect(a).toEqual(b);
  });
});

describe("payload encrypt/decrypt", () => {
  const payload = { v: 1, password: "ñandú 🔐", email: "", notes: "línea1\nlínea2", n: null };

  it("S-VC-4: round-trips incl. unicode and empty strings; IV/ciphertext differ", async () => {
    const dek = await importDek(generateDek());
    const a = await encryptJson(payload, dek, aad.credential("u1", "c1"));
    const b = await encryptJson(payload, dek, aad.credential("u1", "c1"));
    expect(await decryptJson(a, dek, aad.credential("u1", "c1"))).toEqual(payload);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("S-VC-5: flipped bit fails with typed error", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encryptJson(payload, dek, "x");
    const bytes = base64ToBytes(sealed.data);
    bytes[0] ^= 1;
    await expect(decryptJson({ ...sealed, data: bytesToBase64(bytes) }, dek, "x")).rejects.toBeInstanceOf(
      VaultCryptoError,
    );
  });

  it("S-VC-5: swapped IV fails", async () => {
    const dek = await importDek(generateDek());
    const a = await encryptJson(payload, dek, "x");
    const b = await encryptJson(payload, dek, "x");
    await expect(decryptJson({ data: a.data, iv: b.iv }, dek, "x")).rejects.toThrow(VaultCryptoError);
  });

  it("wrong key or wrong AAD fails (row swap between users)", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encryptJson(payload, dek, aad.credential("u1", "c1"));
    await expect(decryptJson(sealed, await importDek(generateDek()), aad.credential("u1", "c1"))).rejects.toThrow();
    await expect(decryptJson(sealed, dek, aad.credential("u2", "c1"))).rejects.toThrow(VaultCryptoError);
  });
});
