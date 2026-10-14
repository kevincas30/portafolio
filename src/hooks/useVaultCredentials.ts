import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyVaultBatch,
  createVaultCredential,
  listVaultCredentials,
  updateVaultCredential,
  type SealedCredential,
  type SealedSettings,
} from "@/lib/user-vault-api";
import { decodeCredentialBlob, encodeCredentialBlob } from "@/lib/vault/blob";
import {
  credentialFromBlob,
  draftToEntry,
  entryFromCredential,
  type CredentialEntry,
} from "@/lib/vault/credential-mapper";
import { findDuplicateGoogle, nullDependents, validateRelations } from "@/lib/vault/credential-rules";
import type { Credential, CredentialDraft, CredentialsController } from "@/types/credential";

export interface VaultSession {
  userId: string;
  dek: CryptoKey;
}

export interface VaultCredentialsController extends CredentialsController {
  /** Cambio atomico de varias filas (grupos, borrado con dependientes). Lo usa useVaultGroups. */
  commit: (changes: { upserts: Credential[]; deletes: string[]; settings?: SealedSettings }) => Promise<void>;
}

async function seal(session: VaultSession, id: string, entry: CredentialEntry): Promise<SealedCredential> {
  const sealed = await encodeCredentialBlob(entry.blob, session.dek, session.userId, id);
  return { id, name: entry.name, payload: sealed.data, payloadIv: sealed.iv };
}

export function useVaultCredentials(
  session: VaultSession | null,
  onSessionError: (reason: unknown) => void,
): VaultCredentialsController {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // El hook se re-crea con cada render del padre: las dependencias estables son userId y dek.
  const userId = session?.userId ?? null;
  const dek = session?.dek ?? null;
  const sessionRef = useRef<VaultSession | null>(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const current = sessionRef.current;
    if (!current) return;
    setLoading(true);
    try {
      const rows = await listVaultCredentials(signal);
      const decoded = await Promise.allSettled(rows.map(async (row) => {
        const blob = await decodeCredentialBlob({ data: row.payload, iv: row.payloadIv }, current.dek, current.userId, row.id);
        return credentialFromBlob(row, blob);
      }));
      if (signal?.aborted) return;
      setCredentials(decoded.flatMap((item) => (item.status === "fulfilled" ? [item.value] : [])));
      const failed = decoded.filter((item) => item.status === "rejected").length;
      setError(failed ? `No se pudieron descifrar ${failed} ${failed === 1 ? "cuenta" : "cuentas"}.` : "");
      setReady(true);
    } catch (reason) {
      if (signal?.aborted) return;
      onSessionError(reason);
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar las cuentas.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onSessionError]);

  useEffect(() => {
    if (!userId || !dek) {
      const timeoutId = window.setTimeout(() => {
        setCredentials([]);
        setReady(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    const controller = new AbortController();
    const initialId = window.setTimeout(() => void refresh(controller.signal), 0);
    // Sin polling: se recarga al volver a la pestana para ver cambios hechos desde otro dispositivo.
    const onVisible = () => { if (!document.hidden) void refresh(controller.signal); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearTimeout(initialId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, dek, refresh]);

  const requireSession = (): VaultSession => {
    if (!sessionRef.current) throw new Error("Desbloquea tu bóveda antes de guardar.");
    return sessionRef.current;
  };

  const guarded = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (reason) {
      onSessionError(reason);
      throw reason;
    }
  }, [onSessionError]);

  // Reglas que antes aplicaba el servidor (CM-2/CM-3), ahora sobre la lista descifrada.
  const validate = (id: string, entry: CredentialEntry) => {
    const candidate = { id, loginMethod: entry.blob.loginMethod, loginCredentialId: entry.blob.loginCredentialId, emailCredentialId: entry.blob.emailCredentialId };
    const relationError = validateRelations(candidate, credentials);
    if (relationError) throw new Error(relationError);
    const duplicate = findDuplicateGoogle(credentials, { id, provider: entry.blob.provider, email: entry.blob.email });
    if (duplicate) {
      throw Object.assign(new Error("Esta cuenta Google ya está guardada."), { existingCredential: duplicate });
    }
  };

  const create = useCallback(async (draft: CredentialDraft) => {
    const current = requireSession();
    const id = globalThis.crypto.randomUUID();
    const entry = draftToEntry(draft);
    validate(id, entry);
    await guarded(async () => createVaultCredential(await seal(current, id, entry)));
    const now = new Date().toISOString();
    const credential = credentialFromBlob({ id, name: entry.name, createdAt: now, updatedAt: now }, entry.blob);
    setCredentials((list) => [...list, credential]);
    return credential;
  }, [credentials, guarded]);

  const update = useCallback(async (existing: Credential, draft: CredentialDraft) => {
    const current = requireSession();
    const entry = draftToEntry(draft, existing);
    validate(existing.id, entry);
    await guarded(async () => updateVaultCredential(await seal(current, existing.id, entry)));
    const credential = credentialFromBlob(
      { id: existing.id, name: entry.name, createdAt: existing.createdAt, updatedAt: new Date().toISOString() },
      entry.blob,
    );
    setCredentials((list) => list.map((item) => (item.id === credential.id ? credential : item)));
    return credential;
  }, [credentials, guarded]);

  const toggleFavorite = useCallback(async (credential: Credential) => {
    const current = requireSession();
    const entry = entryFromCredential(credential);
    entry.blob.favorite = !credential.favorite;
    await guarded(async () => updateVaultCredential(await seal(current, credential.id, entry)));
    setCredentials((list) => list.map((item) => (item.id === credential.id ? { ...item, favorite: entry.blob.favorite } : item)));
  }, [guarded]);

  const commit = useCallback(async (changes: { upserts: Credential[]; deletes: string[]; settings?: SealedSettings }) => {
    const current = requireSession();
    const upserts = await Promise.all(changes.upserts.map((item) => seal(current, item.id, entryFromCredential(item))));
    await guarded(() => applyVaultBatch({ upserts, deletes: changes.deletes, settings: changes.settings }));
    const updated = new Map(changes.upserts.map((item) => [item.id, item]));
    const removed = new Set(changes.deletes);
    setCredentials((list) => list.filter((item) => !removed.has(item.id)).map((item) => updated.get(item.id) ?? item));
  }, [guarded]);

  // Borrar anula las referencias en los dependientes y todo viaja en un unico batch (CM-4).
  const remove = useCallback(async (id: string, force: boolean) => {
    const dependents = nullDependents(credentials, id);
    if (dependents.length > 0 && !force) {
      throw new Error(`Esta cuenta se utiliza para iniciar sesión en ${dependents.length} plataformas.`);
    }
    await commit({ upserts: dependents, deletes: [id] });
  }, [commit, credentials]);

  return { credentials, loading, ready, error, create, update, toggleFavorite, remove, refresh, commit };
}
