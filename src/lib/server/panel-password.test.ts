import { describe, expect, it } from "vitest";
import { hashPanelPassword, verifyPanelPassword } from "@/lib/server/panel-password";

describe("panel-password", () => {
  it("acepta la contrasena correcta y rechaza una incorrecta", async () => {
    const hash = await hashPanelPassword("contrasena-larga-123");
    expect(hash.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(await verifyPanelPassword("contrasena-larga-123", hash)).toBe(true);
    expect(await verifyPanelPassword("contrasena-larga-124", hash)).toBe(false);
    expect(await verifyPanelPassword("", hash)).toBe(false);
  });

  it("genera hashes distintos por salt para la misma contrasena", async () => {
    const [a, b] = await Promise.all([hashPanelPassword("misma"), hashPanelPassword("misma")]);
    expect(a).not.toBe(b);
    expect(await verifyPanelPassword("misma", a)).toBe(true);
    expect(await verifyPanelPassword("misma", b)).toBe(true);
  });

  it("rechaza hashes mal formados sin lanzar", async () => {
    for (const bad of ["", "x", "scrypt$1$2$3", "bcrypt$32768$8$1$AAAA$AAAA", "scrypt$abc$8$1$AAAA$AAAA", "scrypt$32768$8$1$AAAA$AA", "scrypt$1073741824$8$1$AAAA$AAAA"]) {
      expect(await verifyPanelPassword("x", bad)).toBe(false);
    }
  });
});
