import { describe, expect, it } from "vitest";
import { evaluateChallenge, type ChallengeRow } from "./challenges";

const NOW = 1_000_000;
const row: ChallengeRow = { challenge: "abc", userId: "u1", purpose: "authenticate", expiresAt: NOW + 1000 };

describe("evaluateChallenge", () => {
  it("acepta una fila vigente con proposito y usuario correctos", () => {
    expect(evaluateChallenge(row, { purpose: "authenticate", userId: "u1" }, NOW)).toBe("abc");
  });

  it("rechaza ausente, expirada, otro proposito u otro usuario (S-PA-2, S-PA-4)", () => {
    const expected = { purpose: "authenticate", userId: "u1" } as const;
    expect(evaluateChallenge(null, expected, NOW)).toBeNull();
    expect(evaluateChallenge({ ...row, expiresAt: NOW }, expected, NOW)).toBeNull();
    expect(evaluateChallenge(row, { purpose: "register", userId: "u1" }, NOW)).toBeNull();
    expect(evaluateChallenge(row, { purpose: "authenticate", userId: "u2" }, NOW)).toBeNull();
  });
});
