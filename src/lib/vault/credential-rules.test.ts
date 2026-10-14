import { describe, expect, it } from "vitest";
import type { GroupSetting } from "./blob";
import {
  addGroup,
  deleteGroup,
  deriveGroups,
  findDependents,
  findDuplicateGoogle,
  googleDedupeKey,
  nullDependents,
  renameGroup,
  resolveProvider,
  validateRelations,
  type RuleCredential,
} from "./credential-rules";

const cred = (over: Partial<RuleCredential> & { id: string }): RuleCredential => ({
  loginMethod: "password",
  provider: null,
  email: "",
  loginCredentialId: null,
  emailCredentialId: null,
  groupName: "",
  ...over,
});

const gmail = cred({ id: "g1", provider: "google", email: "Gabo@Gmail.com" });

describe("google dedupe", () => {
  it("normalizes email key", () => {
    expect(googleDedupeKey("  Gabo@GMAIL.com ")).toBe("gabo@gmail.com");
  });

  it("S-CM-6: detects duplicate ignoring case/whitespace, excludes itself", () => {
    const candidate = { id: "new", provider: "google" as const, email: " gabo@gmail.com " };
    expect(findDuplicateGoogle([gmail], candidate)?.id).toBe("g1");
    expect(findDuplicateGoogle([gmail], { ...candidate, id: "g1" })).toBeNull();
  });

  it("ignores non-google candidates, empty emails and non-google rows", () => {
    expect(findDuplicateGoogle([gmail], { id: "x", provider: null, email: "gabo@gmail.com" })).toBeNull();
    expect(findDuplicateGoogle([gmail], { id: "x", provider: "google", email: "  " })).toBeNull();
    expect(findDuplicateGoogle([cred({ id: "a", email: "gabo@gmail.com" })], { id: "x", provider: "google", email: "gabo@gmail.com" })).toBeNull();
  });

  it("provider only applies to password login", () => {
    expect(resolveProvider("password", "google")).toBe("google");
    expect(resolveProvider("google", "google")).toBeNull();
  });
});

describe("relations", () => {
  const list = [gmail, cred({ id: "p1" })];

  it("rejects self reference, missing target, incompatible target", () => {
    expect(validateRelations({ id: "a", loginMethod: "password", loginCredentialId: "a", emailCredentialId: null }, list)).toMatch(/consigo/);
    expect(validateRelations({ id: "a", loginMethod: "password", loginCredentialId: "zz", emailCredentialId: null }, list)).toMatch(/no existe/);
    expect(validateRelations({ id: "a", loginMethod: "password", loginCredentialId: "p1", emailCredentialId: null }, list)).toMatch(/compatible/);
    expect(validateRelations({ id: "a", loginMethod: "password", loginCredentialId: null, emailCredentialId: "p1" }, list)).toMatch(/correo/);
  });

  it("requires a Google account when loginMethod is google; accepts valid", () => {
    expect(validateRelations({ id: "a", loginMethod: "google", loginCredentialId: null, emailCredentialId: null }, list)).toMatch(/Selecciona/);
    expect(validateRelations({ id: "a", loginMethod: "google", loginCredentialId: "g1", emailCredentialId: "g1" }, list)).toBeNull();
  });
});

describe("dependents", () => {
  const list = [
    gmail,
    cred({ id: "a", loginCredentialId: "g1" }),
    cred({ id: "b", emailCredentialId: "g1", loginCredentialId: "other" }),
    cred({ id: "c" }),
  ];

  it("finds and nulls only references to the deleted id, only changed rows", () => {
    expect(findDependents(list, "g1").map((c) => c.id)).toEqual(["a", "b"]);
    const nulled = nullDependents(list, "g1");
    expect(nulled.map((c) => c.id)).toEqual(["a", "b"]);
    expect(nulled[0].loginCredentialId).toBeNull();
    expect(nulled[1]).toMatchObject({ emailCredentialId: null, loginCredentialId: "other" });
  });
});

describe("groups", () => {
  const s = (name: string, extra: Partial<GroupSetting> = {}): GroupSetting => ({
    name,
    color: "#111111",
    hidden: false,
    sortOrder: 999,
    colorCustomized: true,
    ...extra,
  });

  it("derive: union of visible settings and groups used by credentials (case-insensitive)", () => {
    const groups = deriveGroups(
      [s("Trabajo", { sortOrder: 1 }), s("Viejo", { hidden: true })],
      [cred({ id: "1", groupName: "trabajo" }), cred({ id: "2", groupName: "Personal " }), cred({ id: "3", groupName: "viejo" })],
    );
    expect(groups).toEqual([
      { name: "Trabajo", color: "#111111" },
      { name: "Personal", color: "#9CA3AF" },
    ]);
  });

  it("add creates or recolors", () => {
    expect(addGroup([], " Nuevo ", "#222222")).toEqual([s("Nuevo", { color: "#222222" })]);
    expect(addGroup([s("X")], "x", "#333333")[0].color).toBe("#333333");
  });

  it("rename hides old, creates new, rewrites affected credentials; rejects clashes", () => {
    const list = [cred({ id: "1", groupName: "A" }), cred({ id: "2", groupName: "a " }), cred({ id: "3", groupName: "B" })];
    const result = renameGroup([s("A"), s("B")], list, "A", "C", "#444444");
    if ("error" in result) throw new Error("unexpected");
    expect(result.credentials.map((c) => [c.id, c.groupName])).toEqual([["1", "C"], ["2", "C"]]);
    expect(result.settings.find((x) => x.name === "A")?.hidden).toBe(true);
    expect(result.settings.find((x) => x.name === "C")).toMatchObject({ color: "#444444", hidden: false });
    expect(renameGroup([s("A"), s("B")], list, "A", "b", "#444444")).toEqual({ error: "Ya existe un grupo con ese nombre." });
  });

  it("delete hides group and clears it from credentials", () => {
    const list = [cred({ id: "1", groupName: "A" }), cred({ id: "2", groupName: "B" })];
    const result = deleteGroup([s("A")], list, "a");
    expect(result.settings[0].hidden).toBe(true);
    expect(result.credentials).toEqual([{ ...list[0], groupName: "" }]);
  });
});
