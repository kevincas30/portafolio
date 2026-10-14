import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  authenticateOptions,
  authenticateVerify,
  createUser,
  listUsers,
  lockVaultSession,
  recoveryParams,
  recoveryUnlock,
  registerOptions,
  registerVerify,
  type VaultUserSummary,
} from "@/lib/user-vault-api";
import { generateDek, importDek } from "@/lib/vault/crypto";
import { base64ToBytes } from "@/lib/vault/encoding";
import { deriveRecoveryKeys, generateRecoveryCode, normalizeRecoveryCode } from "@/lib/vault/recovery";
import { createPasskey, getAssertion } from "@/lib/vault/webauthn-client";
import { buildPasskeyWrapper, buildRecoveryWrapper, openWrapperBytes, passkeyKek } from "@/lib/vault/wrappers";

export type UserVaultStatus = "locked" | "unlocked";
export type UnlockMethod = { kind: "passkey" } | { kind: "recovery"; code: string };

export interface ActiveVaultUser {
  id: string;
  name: string;
}

export const IDLE_LOCK_MS = 15 * 60 * 1000;
export const HIDDEN_LOCK_MS = 5 * 60 * 1000;

interface EnrollmentDraft {
  user: ActiveVaultUser;
  /** Bytes crudos de la DEK: solo viven aqui hasta terminar el alta. */
  dek: Uint8Array;
  recoveryCode: string;
}

export function useUserVault() {
  const [users, setUsers] = useState<VaultUserSummary[]>([]);
  const [usersState, setUsersState] = useState<"loading" | "ready" | "error">("loading");
  const [usersError, setUsersError] = useState("");
  const [active, setActive] = useState<ActiveVaultUser | null>(null);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const enrollment = useRef<EnrollmentDraft | null>(null);
  const lastActivity = useRef(0);
  const hiddenSince = useRef<number | null>(null);

  const refreshUsers = useCallback(async (signal?: AbortSignal) => {
    try {
      const list = await listUsers(signal);
      setUsers(list);
      setUsersError("");
      setUsersState("ready");
    } catch (reason) {
      if (signal?.aborted) return;
      setUsersError(reason instanceof Error ? reason.message : "No se pudieron cargar los usuarios.");
      setUsersState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => void refreshUsers(controller.signal), 0);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [refreshUsers]);

  const discardEnrollment = useCallback(() => {
    enrollment.current?.dek.fill(0);
    enrollment.current = null;
  }, []);

  // Si el panel se bloquea con un alta a medias, los bytes crudos de la DEK no quedan en memoria.
  useEffect(() => () => {
    enrollment.current?.dek.fill(0);
    enrollment.current = null;
  }, []);

  /** Borra la DEK de memoria y cierra la sesion de boveda en el servidor (la fila, no solo la cookie). */
  const lock = useCallback(() => {
    discardEnrollment();
    setDek(null);
    setActive(null);
    void lockVaultSession().catch(() => {});
  }, [discardEnrollment]);

  // Si la API dice 401 la boveda ya no es valida: se bloquea el cliente tambien.
  const handleSessionError = useCallback((reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 401) {
      discardEnrollment();
      setDek(null);
      setActive(null);
    }
  }, [discardEnrollment]);

  // Auto-lock: 15 min sin actividad o 5 min con la pestana oculta (no al instante: copiar de otra app oculta la pestana).
  useEffect(() => {
    if (!dek) return;
    lastActivity.current = Date.now();
    hiddenSince.current = document.hidden ? Date.now() : null;

    const registerActivity = () => { lastActivity.current = Date.now(); };
    const check = () => {
      const now = Date.now();
      if (now - lastActivity.current >= IDLE_LOCK_MS) lock();
      else if (hiddenSince.current !== null && now - hiddenSince.current >= HIDDEN_LOCK_MS) lock();
    };
    const onVisibility = () => {
      hiddenSince.current = document.hidden ? Date.now() : null;
      if (!document.hidden) check();
    };

    const intervalId = window.setInterval(check, 15_000);
    document.addEventListener("visibilitychange", onVisibility);
    const events = ["pointerdown", "keydown", "input", "scroll", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, registerActivity, { passive: true }));
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      events.forEach((name) => window.removeEventListener(name, registerActivity));
    };
  }, [dek, lock]);

  // Desbloqueo fresco: devuelve los bytes crudos de la DEK. Lo usan el desbloqueo normal y el step-up.
  const fetchDekBytes = useCallback(async (user: ActiveVaultUser, method: UnlockMethod): Promise<Uint8Array> => {
    if (method.kind === "passkey") {
      const { options, challengeId } = await authenticateOptions(user.id);
      const { response, prfFirst } = await getAssertion(options);
      const { wrapper } = await authenticateVerify({ userId: user.id, challengeId, response });
      if (!wrapper) {
        throw new Error("Esta passkey no permite descifrar la bóveda. Usa tu código de recuperación.");
      }
      if (!prfFirst) {
        throw new Error("Tu dispositivo no devolvió la clave PRF. Usa tu código de recuperación.");
      }
      return openWrapperBytes(wrapper, await passkeyKek(wrapper, prfFirst), user.id);
    }
    const params = await recoveryParams(user.id);
    const { kek, authToken } = await deriveRecoveryKeys(method.code, base64ToBytes(params.kdfSalt), params.kdfIters);
    const { wrapper } = await recoveryUnlock(user.id, authToken);
    return openWrapperBytes(wrapper, kek, user.id);
  }, []);

  const unlock = useCallback(async (user: ActiveVaultUser, method: UnlockMethod) => {
    // Cambiar de usuario bloquea antes al anterior.
    if (active && active.id !== user.id) lock();
    let bytes: Uint8Array | null = null;
    try {
      bytes = await fetchDekBytes(user, method);
      const key = await importDek(bytes);
      setActive(user);
      setDek(key);
    } catch (reason) {
      // Si la sesion de boveda se emitio pero no se pudo descifrar, no la dejamos abierta.
      void lockVaultSession().catch(() => {});
      throw reason;
    } finally {
      bytes?.fill(0);
    }
  }, [active, fetchDekBytes, lock]);

  const unlockWithPasskey = useCallback((user: ActiveVaultUser) => unlock(user, { kind: "passkey" }), [unlock]);
  const unlockWithRecovery = useCallback(
    (user: ActiveVaultUser, code: string) => unlock(user, { kind: "recovery", code }),
    [unlock],
  );

  /** Paso 1 del alta: crea el usuario pendiente y genera DEK + codigo de recuperacion (en memoria). */
  const beginEnrollment = useCallback(async (name: string): Promise<{ user: ActiveVaultUser; recoveryCode: string }> => {
    discardEnrollment();
    const created = await createUser(name);
    if (created.status !== "pending") throw new Error("Ya existe un usuario con ese nombre.");
    const draft: EnrollmentDraft = {
      user: { id: created.id, name: created.name },
      dek: generateDek(),
      recoveryCode: generateRecoveryCode(),
    };
    enrollment.current = draft;
    return { user: draft.user, recoveryCode: draft.recoveryCode };
  }, [discardEnrollment]);

  /**
   * Paso 2: exige reescribir el codigo (S-VC-9), crea la passkey con PRF, arma los wrappers y los
   * envia en una sola verificacion atomica. Devuelve si la passkey puede descifrar (PRF).
   */
  const completeEnrollment = useCallback(async (confirmation: string, label?: string): Promise<{ prfCapable: boolean }> => {
    const draft = enrollment.current;
    if (!draft) throw new Error("El alta se interrumpió. Empieza de nuevo.");
    if (normalizeRecoveryCode(confirmation) !== normalizeRecoveryCode(draft.recoveryCode)) {
      throw new Error("El código no coincide. Revísalo y vuelve a escribirlo.");
    }

    const { options, challengeId } = await registerOptions(draft.user.id);
    const { response, prfFirst } = await createPasskey(options);
    const passkeyWrapper = prfFirst ? await buildPasskeyWrapper(draft.dek, prfFirst, draft.user.id) : undefined;
    const recovery = await buildRecoveryWrapper(draft.dek, draft.recoveryCode, draft.user.id);
    await registerVerify({
      userId: draft.user.id,
      challengeId,
      response,
      label,
      passkeyWrapper,
      recovery: { wrapper: recovery.wrapper, authToken: recovery.authToken },
    });

    const key = await importDek(draft.dek);
    setActive(draft.user);
    setDek(key);
    discardEnrollment();
    void refreshUsers();
    return { prfCapable: Boolean(prfFirst) };
  }, [discardEnrollment, refreshUsers]);

  /**
   * Agregar passkey a un usuario existente (PA-8): desbloqueo fresco (passkey o codigo) dentro del
   * flujo, y solo entonces la DEK cruda se envuelve para la passkey nueva.
   */
  const addPasskey = useCallback(async (method: UnlockMethod, label?: string): Promise<void> => {
    if (!active || !dek) throw new Error("Desbloquea tu bóveda primero.");
    const bytes = await fetchDekBytes(active, method);
    try {
      const { options, challengeId } = await registerOptions(active.id);
      const { response, prfFirst } = await createPasskey(options);
      if (!prfFirst) {
        throw new Error("Este autenticador no admite PRF, así que no serviría para desbloquear la bóveda.");
      }
      const passkeyWrapper = await buildPasskeyWrapper(bytes, prfFirst, active.id);
      await registerVerify({ userId: active.id, challengeId, response, label, passkeyWrapper });
      void refreshUsers();
    } finally {
      bytes.fill(0);
    }
  }, [active, dek, fetchDekBytes, refreshUsers]);

  return {
    users,
    usersState,
    usersError,
    refreshUsers,
    active,
    dek,
    status: (dek ? "unlocked" : "locked") as UserVaultStatus,
    unlockWithPasskey,
    unlockWithRecovery,
    beginEnrollment,
    completeEnrollment,
    cancelEnrollment: discardEnrollment,
    addPasskey,
    lock,
    handleSessionError,
  };
}

export type UserVaultAccess = ReturnType<typeof useUserVault>;
