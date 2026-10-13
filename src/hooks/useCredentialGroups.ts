import { useCallback, useEffect, useState } from "react";
import {
  createCredentialGroup,
  deleteCredentialGroup,
  getCredentialGroups,
  renameCredentialGroup,
} from "@/lib/credential-group-api";
import type { CredentialGroupDefinition } from "@/types/credential";

export function useCredentialGroups(enabled: boolean) {
  const [groups, setGroups] = useState<CredentialGroupDefinition[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return;
    try {
      setGroups(await getCredentialGroups(signal));
      setError("");
    } catch (reason) {
      if (signal?.aborted) return;
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar los grupos.");
    } finally {
      if (!signal?.aborted) setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const refreshId = window.setTimeout(() => void refresh(controller.signal), 0);
    return () => {
      window.clearTimeout(refreshId);
      controller.abort();
    };
  }, [enabled, refresh]);

  const create = useCallback(async (name: string, color: string) => {
    await createCredentialGroup(name, color);
    await refresh();
  }, [refresh]);

  const rename = useCallback(async (currentName: string, newName: string, color: string) => {
    await renameCredentialGroup(currentName, newName, color);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (name: string) => {
    await deleteCredentialGroup(name);
    await refresh();
  }, [refresh]);

  return { groups, ready, error, refresh, create, rename, remove };
}
