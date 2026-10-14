import { describe, expect, it } from "vitest";
import { generateDek, VaultCryptoError } from "./crypto";
import { generateRecoveryCode, deriveRecoveryKeys } from "./recovery";
import { base64ToBytes } from "./encoding";
import { buildPasskeyWrapper, buildRecoveryWrapper, openWrapperBytes, passkeyKek } from "./wrappers";

const prf = (seed: number) => new Uint8Array(32).fill(seed);

describe("wrapper de passkey", () => {
  it("round trip: abre con el mismo PRF y devuelve la DEK", async () => {
    const dek = generateDek();
    const wrapper = await buildPasskeyWrapper(dek, prf(1), "u1");
    expect(wrapper.kdfIters).toBeNull();
    const opened = await openWrapperBytes(wrapper, await passkeyKek(wrapper, prf(1)), "u1");
    expect(Array.from(opened)).toEqual(Array.from(dek));
  });

  it("falla con otro PRF, otro usuario u otro id de wrapper (AAD)", async () => {
    const wrapper = await buildPasskeyWrapper(generateDek(), prf(1), "u1");
    const kek = await passkeyKek(wrapper, prf(1));
    await expect(openWrapperBytes(wrapper, await passkeyKek(wrapper, prf(2)), "u1")).rejects.toBeInstanceOf(VaultCryptoError);
    await expect(openWrapperBytes(wrapper, kek, "u2")).rejects.toBeInstanceOf(VaultCryptoError);
    await expect(openWrapperBytes({ ...wrapper, id: crypto.randomUUID() }, kek, "u1")).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("cada wrapper usa salt, IV e id distintos", async () => {
    const dek = generateDek();
    const [a, b] = await Promise.all([buildPasskeyWrapper(dek, prf(1), "u1"), buildPasskeyWrapper(dek, prf(1), "u1")]);
    expect(a.kdfSalt).not.toBe(b.kdfSalt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.id).not.toBe(b.id);
  });
});

describe("wrapper de recuperacion", () => {
  it("round trip con el codigo y devuelve un authToken estable para el mismo salt", async () => {
    const dek = generateDek();
    const code = generateRecoveryCode();
    const { wrapper, authToken } = await buildRecoveryWrapper(dek, code, "u1", 1000);
    expect(wrapper.kdfIters).toBe(1000);
    const again = await deriveRecoveryKeys(code, base64ToBytes(wrapper.kdfSalt), wrapper.kdfIters!);
    expect(again.authToken).toBe(authToken);
    const opened = await openWrapperBytes(wrapper, again.kek, "u1");
    expect(Array.from(opened)).toEqual(Array.from(dek));
  });

  it("un codigo distinto no abre el wrapper", async () => {
    const { wrapper } = await buildRecoveryWrapper(generateDek(), generateRecoveryCode(), "u1", 1000);
    const other = await deriveRecoveryKeys(generateRecoveryCode(), base64ToBytes(wrapper.kdfSalt), 1000);
    await expect(openWrapperBytes(wrapper, other.kek, "u1")).rejects.toBeInstanceOf(VaultCryptoError);
  });
});
