import { describe, expect, it } from "vitest";
import { parseWrapper } from "./wrapper-input";

const valid = {
  id: "3f0c1f6e-2b1a-4c1e-9a53-0d6a3a4b5c6d",
  kdfSalt: "q83vEjRWeJCrze8SNFZ4kKvN7xI0VniQq83vEjRWeJA=",
  kdfIters: null,
  iv: "AAAAAAAAAAAAAAAA",
  wrappedDek: "A".repeat(64),
};

describe("parseWrapper", () => {
  it("acepta un wrapper de passkey bien formado (sin iteraciones)", () => {
    expect(parseWrapper(valid, "passkey")).toEqual({ ...valid, kdfIters: null });
  });

  it("exige iteraciones >= 600k para recuperacion y las prohibe en passkey", () => {
    expect(parseWrapper({ ...valid, kdfIters: 600_000 }, "recovery")?.kdfIters).toBe(600_000);
    expect(parseWrapper({ ...valid, kdfIters: 1000 }, "recovery")).toBeNull();
    expect(parseWrapper(valid, "recovery")).toBeNull();
    expect(parseWrapper({ ...valid, kdfIters: 600_000 }, "passkey")).toBeNull();
  });

  it("rechaza ids, ivs o ciphertexts con forma incorrecta", () => {
    expect(parseWrapper({ ...valid, id: "no-uuid" }, "passkey")).toBeNull();
    expect(parseWrapper({ ...valid, iv: "AAAA" }, "passkey")).toBeNull();
    expect(parseWrapper({ ...valid, wrappedDek: "A".repeat(60) }, "passkey")).toBeNull();
    expect(parseWrapper(null, "passkey")).toBeNull();
  });
});
