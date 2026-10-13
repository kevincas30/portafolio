export type LoginMethod = "password" | "google" | "email_code" | "magic_link" | "other" | "website";
export type CredentialProvider = "google" | null;

export interface CredentialGroupDefinition {
  name: string;
  color: string;
}

export interface Credential {
  id: string;
  name: string;
  platform: string;
  category: string;
  groupName: string;
  url: string;
  provider: CredentialProvider;
  loginMethod: LoginMethod;
  email: string;
  username: string;
  encryptedPassword: string | null;
  passwordIv: string | null;
  loginCredentialId: string | null;
  emailCredentialId: string | null;
  accessInstructions: string;
  notes: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialDraft {
  name: string;
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

export interface CredentialPayload extends Omit<CredentialDraft, "password"> {
  id: string;
  encryptedPassword: string | null;
  passwordIv: string | null;
}

export interface VaultConfiguration {
  salt: string;
  verifierCiphertext: string;
  verifierIv: string;
  kdfIterations: number;
}

export interface ImportedCredential {
  name: string;
  url: string;
  username: string;
  password: string;
  notes: string;
}
