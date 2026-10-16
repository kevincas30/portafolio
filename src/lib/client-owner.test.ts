import { describe, expect, it } from "vitest";
import { ownerDescription, ownerLabel, ownersFromColumn, ownersToColumn, parseOwners } from "@/lib/client-owner";

describe("parseOwners", () => {
  it("acepta ids del equipo, quita repetidos y ordena como el equipo", () => {
    expect(parseOwners(["gabriel", "kevs", "gabriel"])).toEqual(["kevs", "gabriel"]);
    expect(parseOwners([])).toEqual([]);
  });

  it("rechaza ids desconocidos y formas invalidas", () => {
    expect(parseOwners(["kevs", "intruso"])).toBeNull();
    expect(parseOwners("kevs")).toBeNull();
    expect(parseOwners([1])).toBeNull();
    expect(parseOwners(undefined)).toBeNull();
  });
});

describe("columna owners", () => {
  it("ida y vuelta", () => {
    expect(ownersFromColumn(ownersToColumn(["kevs", "mar"]))).toEqual(["kevs", "mar"]);
    expect(ownersFromColumn("")).toEqual([]);
    expect(ownersFromColumn(null)).toEqual([]);
  });

  it("descarta ids que ya no estan en el equipo", () => {
    expect(ownersFromColumn("kevs,exmiembro")).toEqual(["kevs"]);
  });
});

describe("etiquetas", () => {
  it("sin asignar, una persona y compartido", () => {
    expect(ownerLabel([])).toBe("Sin asignar");
    expect(ownerLabel(["gabriel"])).toBe("Gabriel");
    expect(ownerLabel(["kevs", "gabriel"])).toBe("Compartido");
    expect(ownerDescription(["kevs", "gabriel", "mar"])).toBe("Compartido: Kevs, Gabriel y Mar");
  });
});
