import { withBase } from "@/lib/base-path";
import type { CredentialGroupDefinition } from "@/types/credential";

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: string };
    return new Error(body.error ?? "No se pudo completar la operación.");
  } catch {
    return new Error("No se pudo completar la operación.");
  }
}

export async function getCredentialGroups(signal?: AbortSignal): Promise<CredentialGroupDefinition[]> {
  const response = await fetch(withBase("/api/credential-groups"), { cache: "no-store", signal });
  if (!response.ok) throw await responseError(response);
  return ((await response.json()) as { groups: CredentialGroupDefinition[] }).groups;
}

export async function createCredentialGroup(name: string, color: string): Promise<void> {
  const response = await fetch(withBase("/api/credential-groups"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!response.ok) throw await responseError(response);
}

export async function renameCredentialGroup(currentName: string, newName: string, color: string): Promise<void> {
  const response = await fetch(withBase("/api/credential-groups"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentName, newName, color }),
  });
  if (!response.ok) throw await responseError(response);
}

export async function deleteCredentialGroup(name: string): Promise<void> {
  const response = await fetch(withBase("/api/credential-groups"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw await responseError(response);
}
