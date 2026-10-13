import { withBase } from "@/lib/base-path";
import type { Credential, CredentialPayload, VaultConfiguration } from "@/types/credential";

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as {
      error?: string;
      dependencies?: Credential[];
      existingCredential?: Credential;
    };
    const error = new Error(body.error ?? "No se pudo completar la operación.");
    Object.assign(error, {
      dependencies: body.dependencies,
      existingCredential: body.existingCredential,
    });
    return error;
  } catch {
    return new Error("No se pudo completar la operación.");
  }
}

export async function getVaultConfiguration(): Promise<VaultConfiguration | null> {
  const response = await fetch(withBase("/api/vault"), { cache: "no-store" });
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as { configuration: VaultConfiguration | null };
  return body.configuration;
}

export async function saveVaultConfiguration(configuration: VaultConfiguration): Promise<void> {
  const response = await fetch(withBase("/api/vault"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(configuration),
  });
  if (!response.ok) throw await responseError(response);
}

export async function getCredentials(signal?: AbortSignal): Promise<Credential[]> {
  const response = await fetch(withBase("/api/credentials"), { cache: "no-store", signal });
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as { credentials: Credential[] };
  return body.credentials;
}

export async function createCredential(payload: CredentialPayload): Promise<Credential> {
  const response = await fetch(withBase("/api/credentials"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { credential: Credential }).credential;
}

export async function updateCredential(payload: CredentialPayload): Promise<Credential> {
  const response = await fetch(withBase("/api/credentials"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { credential: Credential }).credential;
}

export async function deleteCredential(id: string, force = false): Promise<void> {
  const response = await fetch(withBase("/api/credentials"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, force }),
  });
  if (!response.ok) throw await responseError(response);
}
