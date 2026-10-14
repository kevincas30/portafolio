import { describe, expect, it } from "vitest";
import { isFreshUnlock, STEP_UP_MAX_AGE_MS } from "@/lib/server/vault-session";

describe("isFreshUnlock", () => {
  const now = 1_800_000_000_000;

  it("acepta un desbloqueo dentro de la ventana", () => {
    expect(isFreshUnlock(now, now)).toBe(true);
    expect(isFreshUnlock(now - STEP_UP_MAX_AGE_MS, now)).toBe(true);
  });

  it("rechaza un desbloqueo viejo", () => {
    expect(isFreshUnlock(now - STEP_UP_MAX_AGE_MS - 1, now)).toBe(false);
  });

  it("rechaza sesiones previas a la columna (0) y fechas futuras", () => {
    expect(isFreshUnlock(0, now)).toBe(false);
    expect(isFreshUnlock(now + 1000, now)).toBe(false);
  });
});
