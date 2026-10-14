import { describe, expect, it } from "vitest";
import type { Credential, CredentialDraft } from "@/types/credential";
import { credentialFromBlob, draftToEntry, entryFromCredential, normalizeUrl } from "./credential-mapper";

const draft: CredentialDraft = {
  name: "  Netflix ",
  platform: "Netflix",
  category: "Ocio",
  groupName: " Casa ",
  url: "netflix.com",
  provider: "google",
  loginMethod: "password",
  email: " a@b.com ",
  username: "gabo",
  password: "s3cr3t",
  loginCredentialId: "x",
  emailCredentialId: "y",
  accessInstructions: "",
  notes: " nota ",
  favorite: true,
};

describe("draftToEntry", () => {
  it("recorta, normaliza la url y descarta relaciones que no aplican al metodo", () => {
    const { name, blob } = draftToEntry(draft);
    expect(name).toBe("Netflix");
    expect(blob.url).toBe("https://netflix.com/");
    expect(blob.groupName).toBe("Casa");
    expect(blob.password).toBe("s3cr3t");
    expect(blob.provider).toBe("google");
    expect(blob.loginCredentialId).toBeNull();
    expect(blob.emailCredentialId).toBeNull();
  });

  it("para login con Google guarda solo loginCredentialId y vacia password y provider", () => {
    const { blob } = draftToEntry({ ...draft, loginMethod: "google", loginCredentialId: "g1" });
    expect(blob).toMatchObject({ password: "", provider: null, loginCredentialId: "g1", emailCredentialId: null });
  });

  it("website limpia email y username; email_code conserva emailCredentialId", () => {
    expect(draftToEntry({ ...draft, loginMethod: "website" }).blob).toMatchObject({ email: "", username: "" });
    expect(draftToEntry({ ...draft, loginMethod: "email_code", emailCredentialId: "e1" }).blob.emailCredentialId).toBe("e1");
  });

  it("conserva la password existente si el borrador no trae una nueva", () => {
    const existing = credentialFromBlob(
      { id: "1", name: "n", createdAt: "a", updatedAt: "b" },
      { ...draftToEntry(draft).blob, password: "vieja" },
    );
    expect(draftToEntry({ ...draft, password: "" }, existing).blob.password).toBe("vieja");
    expect(draftToEntry({ ...draft, password: "nueva" }, existing).blob.password).toBe("nueva");
  });
});

describe("round trip entry <-> credential", () => {
  it("entryFromCredential invierte credentialFromBlob", () => {
    const entry = draftToEntry({ ...draft, loginMethod: "email_code", emailCredentialId: "e1" });
    const credential: Credential = credentialFromBlob({ id: "1", name: entry.name, createdAt: "a", updatedAt: "b" }, entry.blob);
    expect(entryFromCredential(credential)).toEqual(entry);
    expect(credential.encryptedPassword).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("rechaza protocolos distintos de http(s)", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBe("");
    expect(normalizeUrl("")).toBe("");
  });
});
