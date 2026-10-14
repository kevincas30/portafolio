// Formato de blob v1: lo que se cifra con la DEK. El servidor solo ve `payload` + `payload_iv`.
import type { CredentialProvider, LoginMethod } from "@/types/credential";
import {
  aad,
  decryptJson,
  encryptJson,
  VaultCryptoError,
  type Sealed,
} from "./crypto";

export const BLOB_VERSION = 1;

export interface CredentialBlob {
  v: 1;
  platform: string;
  category: string;
  groupName: string;
  url: string;
  provider: CredentialProvider;
  loginMethod: LoginMethod;
  email: string;
  username: string;
  password: string;
  loginCredentialId: string | null;
  emailCredentialId: string | null;
  accessInstructions: string;
  notes: string;
  favorite: boolean;
}

export interface GroupSetting {
  name: string;
  color: string;
  hidden: boolean;
  sortOrder: number;
  colorCustomized: boolean;
}

export interface SettingsBlob {
  v: 1;
  groups: GroupSetting[];
}

type Versioned = { v?: unknown };

function assertVersion(value: unknown): asserts value is Versioned {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new VaultCryptoError("INVALID_INPUT", "Blob invalido");
  }
  if ((value as Versioned).v !== BLOB_VERSION) {
    throw new VaultCryptoError("UNSUPPORTED_VERSION", `Version de blob no soportada: ${String((value as Versioned).v)}`);
  }
}

export function encodeCredentialBlob(
  blob: Omit<CredentialBlob, "v">,
  dek: CryptoKey,
  userId: string,
  credentialId: string,
): Promise<Sealed> {
  return encryptJson({ ...blob, v: BLOB_VERSION }, dek, aad.credential(userId, credentialId));
}

export async function decodeCredentialBlob(
  sealed: Sealed,
  dek: CryptoKey,
  userId: string,
  credentialId: string,
): Promise<CredentialBlob> {
  const raw = await decryptJson<unknown>(sealed, dek, aad.credential(userId, credentialId));
  assertVersion(raw);
  return raw as CredentialBlob;
}

export function encodeSettingsBlob(
  groups: GroupSetting[],
  dek: CryptoKey,
  userId: string,
): Promise<Sealed> {
  return encryptJson({ v: BLOB_VERSION, groups }, dek, aad.settings(userId));
}

export async function decodeSettingsBlob(
  sealed: Sealed,
  dek: CryptoKey,
  userId: string,
): Promise<SettingsBlob> {
  const raw = await decryptJson<unknown>(sealed, dek, aad.settings(userId));
  assertVersion(raw);
  return raw as SettingsBlob;
}
