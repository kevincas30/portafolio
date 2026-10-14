import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/base-path";

export type PanelStatus = "loading" | "setup" | "locked" | "unlocked" | "error";

const AUTO_LOCK_MS = 30 * 60 * 1000;

async function requestError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: string };
    return new Error(body.error ?? fallback);
  } catch {
    return new Error(fallback);
  }
}

async function startSiteSession(password: string) {
  const response = await fetch(withBase("/api/site-session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!response.ok) throw await requestError(response, "No se pudo abrir el panel.");
}

// Puerta del panel: la contraseña maestra solo se verifica en el servidor. No deriva ni guarda ninguna clave.
export function usePanelSession() {
  const [status, setStatus] = useState<PanelStatus>("loading");
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");
  const lastActivity = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(withBase("/api/vault"), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw await requestError(response, "No se pudo abrir el panel.");
        return (await response.json()) as { configured?: boolean };
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        setConfigured(body.configured === true);
        setStatus(body.configured === true ? "locked" : "setup");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "No se pudo abrir el panel.");
        setStatus("error");
      });

    return () => controller.abort();
  }, []);

  const lock = useCallback(() => {
    setStatus(configured ? "locked" : "setup");
    void fetch(withBase("/api/site-session"), { method: "DELETE", cache: "no-store" }).catch(() => {});
  }, [configured]);

  useEffect(() => {
    if (status !== "unlocked") return;

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
  }, [status, lock]);

  const setup = useCallback(async (password: string) => {
    setError("");
    const response = await fetch(withBase("/api/vault"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw await requestError(response, "No se pudo crear la contraseña.");
    setConfigured(true);
    await startSiteSession(password);
    lastActivity.current = Date.now();
    setStatus("unlocked");
  }, []);

  const unlock = useCallback(async (password: string) => {
    setError("");
    await startSiteSession(password);
    lastActivity.current = Date.now();
    setStatus("unlocked");
  }, []);

  return { status, error, setup, unlock, lock };
}

export type PanelSession = ReturnType<typeof usePanelSession>;
