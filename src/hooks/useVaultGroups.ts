import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVaultSettings, putVaultSettings, type SealedSettings } from "@/lib/user-vault-api";
import { decodeSettingsBlob, encodeSettingsBlob, type GroupSetting } from "@/lib/vault/blob";
import { addGroup, deleteGroup, deriveGroups, renameGroup } from "@/lib/vault/credential-rules";
import type { GroupsController } from "@/types/credential";
import type { VaultCredentialsController, VaultSession } from "@/hooks/useVaultCredentials";

// Los grupos de un usuario = su blob cifrado de ajustes + los grupos usados en sus credenciales (CM-5).
export function useVaultGroups(
  session: VaultSession | null,
  credentialsState: VaultCredentialsController,
  onSessionError: (reason: unknown) => void,
): GroupsController {
  const [settings, setSettings] = useState<GroupSetting[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const userId = session?.userId ?? null;
  const dek = session?.dek ?? null;
  const sessionRef = useRef<VaultSession | null>(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      const stored = await getVaultSettings(signal);
      const decoded = stored ? await decodeSettingsBlob({ data: stored.payload, iv: stored.payloadIv }, current.dek, current.userId) : null;
      if (signal?.aborted) return;
      setSettings(decoded?.groups ?? []);
      setError("");
    } catch (reason) {
      if (signal?.aborted) return;
      onSessionError(reason);
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar los grupos.");
    } finally {
      if (!signal?.aborted) setReady(true);
    }
  }, [onSessionError]);

  useEffect(() => {
    if (!userId || !dek) {
      const timeoutId = window.setTimeout(() => {
        setSettings([]);
        setReady(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    const controller = new AbortController();
    const refreshId = window.setTimeout(() => void refresh(controller.signal), 0);
    return () => {
      window.clearTimeout(refreshId);
      controller.abort();
    };
  }, [userId, dek, refresh]);

  const sealSettings = async (next: GroupSetting[]): Promise<SealedSettings> => {
    const current = sessionRef.current;
    if (!current) throw new Error("Desbloquea tu bóveda antes de guardar.");
    const sealed = await encodeSettingsBlob(next, current.dek, current.userId);
    return { payload: sealed.data, payloadIv: sealed.iv };
  };

  const create = useCallback(async (name: string, color: string) => {
    const next = addGroup(settings, name, color);
    try {
      await putVaultSettings(await sealSettings(next));
    } catch (reason) {
      onSessionError(reason);
      throw reason;
    }
    setSettings(next);
  }, [settings, onSessionError]);

  // Renombrar/borrar reescribe las credenciales afectadas y el blob en un unico batch.
  const rename = useCallback(async (currentName: string, newName: string, color: string) => {
    const change = renameGroup(settings, credentialsState.credentials, currentName, newName, color);
    if ("error" in change) throw new Error(change.error);
    await credentialsState.commit({ upserts: change.credentials, deletes: [], settings: await sealSettings(change.settings) });
    setSettings(change.settings);
  }, [settings, credentialsState]);

  const remove = useCallback(async (name: string) => {
    const change = deleteGroup(settings, credentialsState.credentials, name);
    await credentialsState.commit({ upserts: change.credentials, deletes: [], settings: await sealSettings(change.settings) });
    setSettings(change.settings);
  }, [settings, credentialsState]);

  const groups = useMemo(
    () => deriveGroups(settings, credentialsState.credentials),
    [settings, credentialsState.credentials],
  );

  return { groups, ready, error, refresh, create, rename, remove };
}
