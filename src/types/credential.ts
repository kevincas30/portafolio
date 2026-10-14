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
  /** Boveda por usuario: la password ya descifrada, solo en memoria. Las filas legacy no la traen. */
  password?: string;
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

/** Lo que necesita la pantalla de contrasenas de cualquiera de las dos rutas (legacy o por usuario). */
export interface CredentialsController {
  credentials: Credential[];
  loading: boolean;
  ready: boolean;
  error: string;
  create: (draft: CredentialDraft) => Promise<Credential>;
  update: (existing: Credential, draft: CredentialDraft) => Promise<Credential>;
  toggleFavorite: (credential: Credential) => Promise<void>;
  remove: (id: string, force: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface GroupsController {
  groups: CredentialGroupDefinition[];
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  create: (name: string, color: string) => Promise<void>;
  rename: (currentName: string, newName: string, color: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
}
