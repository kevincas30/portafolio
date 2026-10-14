import { describe, expect, it } from "vitest";
import { createVaultConfiguration, encryptPassword, PLAINTEXT_PASSWORD_IV } from "@/lib/credential-crypto";
import type { Credential } from "@/types/credential";
import { decodeCredentialBlob } from "./blob";
import { generateDek, importDek } from "./crypto";
import {
  MigrationError,
  transformLegacyRows,
  transformLegacySettings,
  verifyMigration,
} from "./migration";

const USER = "gabo-id";

function legacy(over: Partial<Credential> & { id: string }): Credential {
  return {
    name: "Nombre",
    platform: "Plat",
    category: "cat",
    groupName: "G",
    url: "https://x.test",
    provider: null,
    loginMethod: "password",
    email: "a@b.c",
    username: "user",
    encryptedPassword: null,
    passwordIv: null,
    loginCredentialId: null,
    emailCredentialId: null,
    accessInstructions: "",
    notes: "",
    favorite: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...over,
  };
}

async function setup() {
  const { key: legacyKey } = await createVaultConfiguration("master-password");
  const dek = await importDek(generateDek());
  const enc = await encryptPassword("pässw0rd 🔐", legacyKey);
  return { legacyKey, dek, enc };
}

describe("legacy migration", () => {
  it("S-VM-1: encrypted legacy row -> payload decrypts to the legacy fields", async () => {
    const { legacyKey, dek, enc } = await setup();
    const row = legacy({ id: "r1", encryptedPassword: enc.encryptedPassword, passwordIv: enc.passwordIv, notes: "n" });
    const [out] = await transformLegacyRows([row], legacyKey, dek, USER);
    const blob = await decodeCredentialBlob({ data: out.payload, iv: out.payloadIv }, dek, USER, "r1");
    expect(blob).toMatchObject({ v: 1, password: "pässw0rd 🔐", email: "a@b.c", username: "user", notes: "n", groupName: "G" });
    expect(out.name).toBe("Nombre");
  });

  it("S-VM-2: plaintext:v1 row uses the stored value without a legacy key", async () => {
    const { dek } = await setup();
    const row = legacy({ id: "r2", encryptedPassword: "plain-pw", passwordIv: PLAINTEXT_PASSWORD_IV });
    const [out] = await transformLegacyRows([row], null, dek, USER);
    expect((await decodeCredentialBlob({ data: out.payload, iv: out.payloadIv }, dek, USER, "r2")).password).toBe("plain-pw");
  });

  it("S-VM-3: mixed set converts fully, count in == count out", async () => {
    const { legacyKey, dek, enc } = await setup();
    const rows = [
      legacy({ id: "a", encryptedPassword: enc.encryptedPassword, passwordIv: enc.passwordIv }),
      legacy({ id: "b", encryptedPassword: "x", passwordIv: PLAINTEXT_PASSWORD_IV }),
      legacy({ id: "c", loginMethod: "website" }),
    ];
    const out = await transformLegacyRows(rows, legacyKey, dek, USER);
    expect(out.map((o) => o.id)).toEqual(["a", "b", "c"]);
    await expect(verifyMigration(out, null, dek, USER)).resolves.toBeUndefined();
  });

  it("S-VM-4: one undecryptable row throws and returns nothing", async () => {
    const { legacyKey, dek, enc } = await setup();
    const { key: otherKey } = await createVaultConfiguration("otra-clave");
    const bad = await encryptPassword("secreto", otherKey);
    const rows = [
      legacy({ id: "ok", encryptedPassword: enc.encryptedPassword, passwordIv: enc.passwordIv }),
      legacy({ id: "bad", encryptedPassword: bad.encryptedPassword, passwordIv: bad.passwordIv }),
    ];
    const attempt = transformLegacyRows(rows, legacyKey, dek, USER);
    await expect(attempt).rejects.toBeInstanceOf(MigrationError);
    await expect(attempt).rejects.toMatchObject({ rowId: "bad" });
  });

  it("S-VM-5: corrupted payload makes verify fail", async () => {
    const { legacyKey, dek, enc } = await setup();
    const out = await transformLegacyRows(
      [legacy({ id: "r", encryptedPassword: enc.encryptedPassword, passwordIv: enc.passwordIv })],
      legacyKey,
      dek,
      USER,
    );
    const flipped = out[0].payload.startsWith("A") ? "B" : "A";
    await expect(verifyMigration([{ ...out[0], payload: flipped + out[0].payload.slice(1) }], null, dek, USER)).rejects.toBeInstanceOf(MigrationError);
  });

  it("S-VM-5: payload that decrypts but differs from the source fails verify", async () => {
    const { legacyKey, dek, enc } = await setup();
    const [out] = await transformLegacyRows(
      [legacy({ id: "r", encryptedPassword: enc.encryptedPassword, passwordIv: enc.passwordIv })],
      legacyKey,
      dek,
      USER,
    );
    const tampered = { ...out, expected: { ...out.expected, password: "otra" } };
    await expect(verifyMigration([tampered], null, dek, USER)).rejects.toBeInstanceOf(MigrationError);
  });

  it("S-VM-6: null/empty optional fields and relation ids round-trip", async () => {
    const { dek } = await setup();
    const row = legacy({
      id: "r",
      loginMethod: "google",
      email: "",
      username: "",
      url: "",
      groupName: "",
      loginCredentialId: "g1",
      emailCredentialId: "g2",
      favorite: true,
    });
    const out = await transformLegacyRows([row], null, dek, USER);
    await verifyMigration(out, null, dek, USER);
    expect(out[0].expected).toMatchObject({ password: "", loginCredentialId: "g1", emailCredentialId: "g2", favorite: true });
  });

  it("group settings migrate and verify; a mismatch fails", async () => {
    const { dek } = await setup();
    const settings = await transformLegacySettings(
      [{ name: "G", color: "#112233", hidden: false, sortOrder: 2, colorCustomized: true }],
      dek,
      USER,
    );
    await expect(verifyMigration([], settings, dek, USER)).resolves.toBeUndefined();
    await expect(
      verifyMigration([], { ...settings, expected: [{ ...settings.expected[0], color: "#000000" }] }, dek, USER),
    ).rejects.toBeInstanceOf(MigrationError);
  });
});
