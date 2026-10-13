import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/base-path";
import { createVaultConfiguration, unlockVault } from "@/lib/credential-crypto";
import { getVaultConfiguration, saveVaultConfiguration } from "@/lib/credential-api";
import type { VaultConfiguration } from "@/types/credential";

export type VaultStatus = "loading" | "setup" | "locked" | "unlocked" | "error";

const AUTO_LOCK_MS = 30 * 60 * 1000;

async function startSiteSession(password: string) {
  const response = await fetch(withBase("/api/site-session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error ?? "No se pudo abrir el panel.");
  }
}

export function useVault() {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [configuration, setConfiguration] = useState<VaultConfiguration | null>(null);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState("");
  const lastActivity = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    void getVaultConfiguration()
      .then((storedConfiguration) => {
        if (controller.signal.aborted) return;
        setConfiguration(storedConfiguration);
        setStatus(storedConfiguration ? "locked" : "setup");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "No se pudo abrir el panel.");
        setStatus("error");
      });

    return () => controller.abort();
  }, []);

  const lock = useCallback(() => {
    setKey(null);
    setStatus(configuration ? "locked" : "setup");
    void fetch(withBase("/api/site-session"), { method: "DELETE", cache: "no-store" }).catch(() => {});
  }, [configuration]);

  useEffect(() => {
    if (!key) return;

    const registerActivity = () => {
      lastActivity.current = Date.now();
    };
    const intervalId = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= AUTO_LOCK_MS) lock();
    }, 15_000);
    const sessionIntervalId = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= AUTO_LOCK_MS) return;
      void fetch(withBase("/api/site-session"), { cache: "no-store" })
        .then((response) => { if (response.status === 401) lock(); })
        .catch(() => {});
    }, 60_000);

    window.addEventListener("pointerdown", registerActivity, { passive: true });
    window.addEventListener("keydown", registerActivity);
    window.addEventListener("input", registerActivity);
    window.addEventListener("scroll", registerActivity, { passive: true });
    window.addEventListener("touchstart", registerActivity, { passive: true });
    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(sessionIntervalId);
      window.removeEventListener("pointerdown", registerActivity);
      window.removeEventListener("keydown", registerActivity);
      window.removeEventListener("input", registerActivity);
      window.removeEventListener("scroll", registerActivity);
      window.removeEventListener("touchstart", registerActivity);
    };
  }, [key, lock]);

  const setup = useCallback(async (masterPassword: string) => {
    setError("");
    const created = await createVaultConfiguration(masterPassword);
    await saveVaultConfiguration(created.configuration);
    setConfiguration(created.configuration);
    setStatus("locked");
    await startSiteSession(masterPassword);
    setKey(created.key);
    lastActivity.current = Date.now();
    setStatus("unlocked");
  }, []);

  const unlock = useCallback(async (masterPassword: string) => {
    if (!configuration) throw new Error("El panel todavía no está configurado.");
    setError("");
    const unlockedKey = await unlockVault(masterPassword, configuration);
    await startSiteSession(masterPassword);
    setKey(unlockedKey);
    lastActivity.current = Date.now();
    setStatus("unlocked");
  }, [configuration]);

  return {
    status,
    key,
    error,
    setup,
    unlock,
    lock,
  };
}

export type VaultAccess = ReturnType<typeof useVault>;
