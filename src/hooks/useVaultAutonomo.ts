import { useCallback, useEffect, useRef, useState } from "react";
import { applyAutonomoBatch, getVaultAutonomo, type AutonomoBatch, type SealedInvoice } from "@/lib/user-vault-api";
import { decodeAutonomoSettings, decodeInvoiceBlob, encodeAutonomoSettings, encodeInvoiceBlob } from "@/lib/autonomo/blob";
import { defaultAutonomoSettings } from "@/lib/autonomo/invoice";
import type { VaultSession } from "@/hooks/useVaultCredentials";
import type { AutonomoSettings, Invoice, InvoiceDraft } from "@/types/autonomo";

const newId = () => globalThis.crypto.randomUUID();

async function sealInvoice(session: VaultSession, id: string, draft: InvoiceDraft): Promise<SealedInvoice> {
  const sealed = await encodeInvoiceBlob(draft, session.dek, session.userId, id);
  return { id, payload: sealed.data, payloadIv: sealed.iv };
}

export interface AutonomoController {
  invoices: Invoice[];
  settings: AutonomoSettings;
  loading: boolean;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  saveInvoice: (draft: InvoiceDraft, existing?: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  saveSettings: (settings: AutonomoSettings) => Promise<void>;
}

// Autonomo de la boveda desbloqueada: se descifra en el navegador y se guarda en batches atomicos.
export function useVaultAutonomo(session: VaultSession | null, onSessionError: (reason: unknown) => void): AutonomoController {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AutonomoSettings>(defaultAutonomoSettings);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const userId = session?.userId ?? null;
  const dek = session?.dek ?? null;
  const sessionRef = useRef<VaultSession | null>(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const requireSession = (): VaultSession => {
    if (!sessionRef.current) throw new Error("Desbloquea tu bóveda antes de guardar.");
    return sessionRef.current;
  };

  const commit = useCallback(async (batch: AutonomoBatch) => {
    try {
      await applyAutonomoBatch(batch);
    } catch (reason) {
      onSessionError(reason);
      throw reason;
    }
  }, [onSessionError]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const current = sessionRef.current;
    if (!current) return;
    setLoading(true);
    try {
      const data = await getVaultAutonomo(signal);
      const decoded = await Promise.allSettled(data.invoices.map(async (row) => {
        const blob = await decodeInvoiceBlob({ data: row.payload, iv: row.payloadIv }, current.dek, current.userId, row.id);
        return { id: row.id, ...blob, createdAt: row.createdAt, updatedAt: row.updatedAt };
      }));
      const loadedSettings = data.settings
        ? await decodeAutonomoSettings({ data: data.settings.payload, iv: data.settings.payloadIv }, current.dek, current.userId)
        : defaultAutonomoSettings();
      if (signal?.aborted) return;

      const failed = decoded.filter((item) => item.status === "rejected").length;
      setInvoices(decoded.flatMap((item) => (item.status === "fulfilled" ? [item.value] : [])));
      setSettings(loadedSettings);
      setError(failed ? `No se pudieron descifrar ${failed} ${failed === 1 ? "factura" : "facturas"}.` : "");
      setReady(true);
    } catch (reason) {
      if (signal?.aborted) return;
      onSessionError(reason);
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar tus datos de autónomo.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onSessionError]);

  useEffect(() => {
    if (!userId || !dek) {
      const timeoutId = window.setTimeout(() => {
        setInvoices([]);
        setSettings(defaultAutonomoSettings());
        setReady(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    const controller = new AbortController();
    const initialId = window.setTimeout(() => void refresh(controller.signal), 0);
    const onVisible = () => { if (!document.hidden) void refresh(controller.signal); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearTimeout(initialId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, dek, refresh]);

  const saveInvoice = useCallback(async (draft: InvoiceDraft, existing?: Invoice) => {
    const current = requireSession();
    const id = existing?.id ?? newId();
    const clean = { ...draft, number: draft.number.trim(), counterparty: draft.counterparty.trim(), note: draft.note.trim() };
    await commit({ upserts: [await sealInvoice(current, id, clean)], deletes: [] });
    const now = new Date().toISOString();
    const saved: Invoice = { id, ...clean, createdAt: existing?.createdAt ?? now, updatedAt: now };
    setInvoices((list) => (existing ? list.map((item) => (item.id === id ? saved : item)) : [...list, saved]));
  }, [commit]);

  const deleteInvoice = useCallback(async (id: string) => {
    await commit({ upserts: [], deletes: [id] });
    setInvoices((list) => list.filter((item) => item.id !== id));
  }, [commit]);

  const saveSettings = useCallback(async (next: AutonomoSettings) => {
    const current = requireSession();
    const sealed = await encodeAutonomoSettings(next, current.dek, current.userId);
    await commit({ upserts: [], deletes: [], settings: { payload: sealed.data, payloadIv: sealed.iv } });
    setSettings(next);
  }, [commit]);

  return { invoices, settings, loading, ready, error, refresh, saveInvoice, deleteInvoice, saveSettings };
}
