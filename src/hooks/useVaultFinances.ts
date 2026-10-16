import { useCallback, useEffect, useRef, useState } from "react";
import { applyFinanceBatch, getVaultFinances, type FinanceBatch, type SealedFinanceEntry } from "@/lib/user-vault-api";
import { decodeEntryBlob, decodeFinanceSettings, encodeEntryBlob, encodeFinanceSettings } from "@/lib/finance/blob";
import { defaultFinanceSettings } from "@/lib/finance/defaults";
import { runRecurring, type PendingEntry } from "@/lib/finance/recurring";
import { getTodayKey } from "@/lib/dates";
import type { VaultSession } from "@/hooks/useVaultCredentials";
import type { FinanceEntry, FinanceEntryDraft, FinanceSettings, RecurringRule } from "@/types/finance";

const newId = () => globalThis.crypto.randomUUID();

async function sealEntry(session: VaultSession, entry: PendingEntry): Promise<SealedFinanceEntry> {
  const { id, kind, amount, date, categoryId, note, recurringId } = entry;
  const sealed = await encodeEntryBlob({ kind, amount, date, categoryId, note, recurringId }, session.dek, session.userId, id);
  return { id, payload: sealed.data, payloadIv: sealed.iv };
}

function stamp(entry: PendingEntry, createdAt?: string): FinanceEntry {
  const now = new Date().toISOString();
  return { ...entry, createdAt: createdAt ?? now, updatedAt: now };
}

export interface FinancesController {
  entries: FinanceEntry[];
  settings: FinanceSettings;
  loading: boolean;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  saveEntry: (draft: FinanceEntryDraft, existing?: FinanceEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  saveSettings: (settings: FinanceSettings) => Promise<void>;
  /** Guarda la lista de gastos fijos y anota enseguida lo que ya les toca. Devuelve cuantos anoto. */
  saveRecurringRules: (rules: RecurringRule[]) => Promise<number>;
}

// Finanzas de la boveda desbloqueada: se descifra todo en el navegador y se guarda en batches atomicos.
export function useVaultFinances(session: VaultSession | null, onSessionError: (reason: unknown) => void): FinancesController {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [settings, setSettings] = useState<FinanceSettings>(defaultFinanceSettings);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const userId = session?.userId ?? null;
  const dek = session?.dek ?? null;
  const sessionRef = useRef<VaultSession | null>(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const requireSession = (): VaultSession => {
    if (!sessionRef.current) throw new Error("Desbloquea tu bóveda antes de guardar.");
    return sessionRef.current;
  };

  const commit = useCallback(async (batch: FinanceBatch) => {
    try {
      await applyFinanceBatch(batch);
    } catch (reason) {
      onSessionError(reason);
      throw reason;
    }
  }, [onSessionError]);

  const sealSettings = async (current: VaultSession, next: FinanceSettings) => {
    const sealed = await encodeFinanceSettings(next, current.dek, current.userId);
    return { payload: sealed.data, payloadIv: sealed.iv };
  };

  /** Anota lo que deben los gastos fijos y guarda filas + ajustes juntos. Devuelve cuantos anoto. */
  const applyRecurring = useCallback(async (current: VaultSession, base: FinanceSettings): Promise<{ settings: FinanceSettings; created: FinanceEntry[] }> => {
    const run = runRecurring(base.recurring, getTodayKey(), newId);
    const next = { ...base, recurring: run.rules };
    const upserts = await Promise.all(run.entries.map((entry) => sealEntry(current, entry)));
    await commit({ upserts, deletes: [], settings: await sealSettings(current, next) });
    return { settings: next, created: run.entries.map((entry) => stamp(entry)) };
  }, [commit]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const current = sessionRef.current;
    if (!current) return;
    setLoading(true);
    try {
      const data = await getVaultFinances(signal);
      const decoded = await Promise.allSettled(data.entries.map(async (row) => {
        const blob = await decodeEntryBlob({ data: row.payload, iv: row.payloadIv }, current.dek, current.userId, row.id);
        return { id: row.id, ...blob, createdAt: row.createdAt, updatedAt: row.updatedAt };
      }));
      let loadedSettings = data.settings
        ? await decodeFinanceSettings({ data: data.settings.payload, iv: data.settings.payloadIv }, current.dek, current.userId)
        : defaultFinanceSettings();
      if (signal?.aborted) return;

      let loaded = decoded.flatMap((item) => (item.status === "fulfilled" ? [item.value] : []));
      const failed = decoded.filter((item) => item.status === "rejected").length;

      // Gastos fijos que vencieron desde la ultima vez que se abrio la boveda.
      if (runRecurring(loadedSettings.recurring, getTodayKey(), newId).entries.length > 0) {
        const result = await applyRecurring(current, loadedSettings);
        loadedSettings = result.settings;
        loaded = [...loaded, ...result.created];
      }

      setEntries(loaded);
      setSettings(loadedSettings);
      setError(failed ? `No se pudieron descifrar ${failed} ${failed === 1 ? "movimiento" : "movimientos"}.` : "");
      setReady(true);
    } catch (reason) {
      if (signal?.aborted) return;
      onSessionError(reason);
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar tus finanzas.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [applyRecurring, onSessionError]);

  useEffect(() => {
    if (!userId || !dek) {
      const timeoutId = window.setTimeout(() => {
        setEntries([]);
        setSettings(defaultFinanceSettings());
        setReady(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    const controller = new AbortController();
    const initialId = window.setTimeout(() => void refresh(controller.signal), 0);
    // Sin polling: se recarga al volver a la pestana para ver lo anotado desde el movil.
    const onVisible = () => { if (!document.hidden) void refresh(controller.signal); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearTimeout(initialId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, dek, refresh]);

  const saveEntry = useCallback(async (draft: FinanceEntryDraft, existing?: FinanceEntry) => {
    const current = requireSession();
    const entry: PendingEntry = { id: existing?.id ?? newId(), ...draft, note: draft.note.trim(), recurringId: existing?.recurringId ?? null };
    await commit({ upserts: [await sealEntry(current, entry)], deletes: [] });
    const saved = stamp(entry, existing?.createdAt);
    setEntries((list) => (existing ? list.map((item) => (item.id === saved.id ? saved : item)) : [...list, saved]));
  }, [commit]);

  const deleteEntry = useCallback(async (id: string) => {
    await commit({ upserts: [], deletes: [id] });
    setEntries((list) => list.filter((item) => item.id !== id));
  }, [commit]);

  const saveSettings = useCallback(async (next: FinanceSettings) => {
    const current = requireSession();
    await commit({ upserts: [], deletes: [], settings: await sealSettings(current, next) });
    setSettings(next);
  }, [commit]);

  const saveRecurringRules = useCallback(async (recurring: RecurringRule[]) => {
    const current = requireSession();
    const result = await applyRecurring(current, { ...settingsRef.current, recurring });
    setSettings(result.settings);
    setEntries((list) => [...list, ...result.created]);
    return result.created.length;
  }, [applyRecurring]);

  return { entries, settings, loading, ready, error, refresh, saveEntry, deleteEntry, saveSettings, saveRecurringRules };
}
