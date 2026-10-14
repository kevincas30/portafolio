// Mapeo puro entre el borrador del formulario, el blob cifrado y el Credential que consume la UI.
// Replica la normalizacion que antes hacia useCredentials.buildPayload (url, provider, relaciones).
import type { Credential, CredentialDraft } from "@/types/credential";
import type { CredentialBlob } from "./blob";

export type BlobBody = Omit<CredentialBlob, "v">;

export interface CredentialEntry {
  name: string;
  blob: BlobBody;
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Borrador -> entrada a cifrar. Si no se escribe password nueva se conserva la de `existing`. */
export function draftToEntry(draft: CredentialDraft, existing?: Credential): CredentialEntry {
  const keepsOwnPassword = draft.loginMethod === "password";
  const isWebsite = draft.loginMethod === "website";
  return {
    name: draft.name.trim(),
    blob: {
      platform: draft.platform.trim(),
      category: draft.category.trim(),
      groupName: draft.groupName.trim(),
      url: normalizeUrl(draft.url),
      provider: keepsOwnPassword ? draft.provider : null,
      loginMethod: draft.loginMethod,
      email: isWebsite ? "" : draft.email.trim(),
      username: isWebsite ? "" : draft.username.trim(),
      password: keepsOwnPassword ? draft.password || existing?.password || "" : "",
      loginCredentialId: draft.loginMethod === "google" ? draft.loginCredentialId : null,
      emailCredentialId:
        draft.loginMethod === "email_code" || draft.loginMethod === "magic_link" ? draft.emailCredentialId : null,
      accessInstructions: draft.accessInstructions.trim(),
      notes: draft.notes.trim(),
      favorite: draft.favorite,
    },
  };
}

export function entryFromCredential(credential: Credential): CredentialEntry {
  return {
    name: credential.name,
    blob: {
      platform: credential.platform,
      category: credential.category,
      groupName: credential.groupName,
      url: credential.url,
      provider: credential.provider,
      loginMethod: credential.loginMethod,
      email: credential.email,
      username: credential.username,
      password: credential.password ?? "",
      loginCredentialId: credential.loginCredentialId,
      emailCredentialId: credential.emailCredentialId,
      accessInstructions: credential.accessInstructions,
      notes: credential.notes,
      favorite: credential.favorite,
    },
  };
}

/** Blob descifrado + metadatos en claro -> Credential de la UI (la password queda solo en memoria). */
export function credentialFromBlob(
  meta: { id: string; name: string; createdAt: string; updatedAt: string },
  blob: BlobBody,
): Credential {
  return {
    id: meta.id,
    name: meta.name,
    platform: blob.platform,
    category: blob.category,
    groupName: blob.groupName,
    url: blob.url,
    provider: blob.provider,
    loginMethod: blob.loginMethod,
    email: blob.email,
    username: blob.username,
    encryptedPassword: null,
    passwordIv: null,
    password: blob.password,
    loginCredentialId: blob.loginCredentialId,
    emailCredentialId: blob.emailCredentialId,
    accessInstructions: blob.accessInstructions,
    notes: blob.notes,
    favorite: blob.favorite,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}
