import { describe, expect, it } from "vitest";
import { ACTIVITIES, findActivity } from "@/lib/autonomo/activities";

describe("epígrafes del IAE", () => {
  it("la sección decide si la actividad es profesional (con retención)", () => {
    expect(findActivity("763")).toMatchObject({ section: 2, professional: true });
    expect(findActivity("399")).toMatchObject({ section: 2, professional: true });
    expect(findActivity("845")).toMatchObject({ section: 1, professional: false });
    expect(findActivity("844")).toMatchObject({ section: 1, professional: false });
  });

  it("un código fuera del catálogo no se reconoce", () => {
    expect(findActivity("999")).toBeNull();
    expect(findActivity("")).toBeNull();
  });

  it("los códigos del catálogo no se repiten", () => {
    expect(new Set(ACTIVITIES.map((activity) => activity.code)).size).toBe(ACTIVITIES.length);
  });
});
