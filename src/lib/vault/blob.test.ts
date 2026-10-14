import { describe, expect, it } from "vitest";
import {
  decodeCredentialBlob,
  decodeSettingsBlob,
  encodeCredentialBlob,
  encodeSettingsBlob,
  type CredentialBlob,
} from "./blob";
import { encryptJson, generateDek, importDek, VaultCryptoError, aad } from "./crypto";

const base: Omit<CredentialBlob, "v"> = {
  platform: "GitHub",
  category: "dev",
  groupName: "Trabajo",
  url: "https://github.com",
  provider: null,
  loginMethod: "password",
  email: "",
  username: "gabo",
  password: "s3cr€t",
  loginCredentialId: null,
  emailCredentialId: "c-2",
  accessInstructions: "",
  notes: "nota\ncon salto",
  favorite: true,
};

describe("blob v1", () => {
  it("round-trips a credential blob", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encodeCredentialBlob(base, dek, "u1", "c1");
    expect(await decodeCredentialBlob(sealed, dek, "u1", "c1")).toEqual({ ...base, v: 1 });
  });

  it("round-trips a settings blob", async () => {
    const dek = await importDek(generateDek());
    const groups = [{ name: "A", color: "#fff", hidden: false, sortOrder: 1, colorCustomized: true }];
    const sealed = await encodeSettingsBlob(groups, dek, "u1");
    expect(await decodeSettingsBlob(sealed, dek, "u1")).toEqual({ v: 1, groups });
  });

  it("S-VC-7: unknown version -> typed error", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encryptJson({ ...base, v: 2 }, dek, aad.credential("u1", "c1"));
    await expect(decodeCredentialBlob(sealed, dek, "u1", "c1")).rejects.toMatchObject({
      name: "VaultCryptoError",
      code: "UNSUPPORTED_VERSION",
    });
  });

  it("missing version is rejected too", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encryptJson(base, dek, aad.settings("u1"));
    await expect(decodeSettingsBlob(sealed, dek, "u1")).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("blob decrypted under another user's/row's AAD fails", async () => {
    const dek = await importDek(generateDek());
    const sealed = await encodeCredentialBlob(base, dek, "u1", "c1");
    await expect(decodeCredentialBlob(sealed, dek, "u2", "c1")).rejects.toThrow(VaultCryptoError);
    await expect(decodeCredentialBlob(sealed, dek, "u1", "c2")).rejects.toThrow(VaultCryptoError);
  });
});
