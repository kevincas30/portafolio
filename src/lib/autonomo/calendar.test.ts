import { describe, expect, it } from "vitest";
import { filingObligations, obligationsFor } from "@/lib/autonomo/calendar";
import { defaultAutonomoSettings } from "@/lib/autonomo/invoice";
import type { AutonomoSettings } from "@/types/autonomo";

const settings = (patch: Partial<AutonomoSettings> = {}): AutonomoSettings => ({ ...defaultAutonomoSettings(), activityStart: "2026-11-01", ...patch });

describe("obligaciones de un año fiscal", () => {
  it("303 y 130 cada trimestre, 390 en enero y renta de abril a junio", () => {
    const list = filingObligations(2026).map(({ id, start, end }) => [id, start, end]);
    expect(list).toEqual([
      ["303-2026-1", "2026-04-01", "2026-04-20"],
      ["130-2026-1", "2026-04-01", "2026-04-20"],
      ["303-2026-2", "2026-07-01", "2026-07-20"],
      ["130-2026-2", "2026-07-01", "2026-07-20"],
      ["303-2026-3", "2026-10-01", "2026-10-20"],
      ["130-2026-3", "2026-10-01", "2026-10-20"],
      ["303-2026-4", "2027-01-01", "2027-01-30"],
      ["130-2026-4", "2027-01-01", "2027-01-30"],
      ["390-2026", "2027-01-01", "2027-01-30"],
      ["100-2026", "2027-04-01", "2027-06-30"],
    ]);
  });
});

describe("calendario a hoy", () => {
  it("solo desde el alta, ordenado por plazo y con su estado", () => {
    const list = obligationsFor("2027-01-12", settings({ filed: ["130-2026-4"] }));
    expect(list.map(({ id, status }) => [id, status])).toEqual([
      ["303-2026-4", "open"],
      ["130-2026-4", "filed"],
      ["390-2026", "open"],
      ["303-2027-1", "upcoming"],
      ["130-2027-1", "upcoming"],
      ["100-2026", "upcoming"],
      ["303-2027-2", "upcoming"],
      ["130-2027-2", "upcoming"],
      ["303-2027-3", "upcoming"],
      ["130-2027-3", "upcoming"],
      ["303-2027-4", "upcoming"],
      ["130-2027-4", "upcoming"],
      ["390-2027", "upcoming"],
      ["100-2027", "upcoming"],
    ]);
  });

  it("del día 1 al 9 toca revisar y desde el 10 presentar", () => {
    const [first] = obligationsFor("2027-01-09", settings());
    expect(first.stage).toBe("review");
    expect(obligationsFor("2027-01-10", settings())[0].stage).toBe("file");
  });

  it("un plazo vencido sin presentar queda atrasado", () => {
    const list = obligationsFor("2027-02-01", settings());
    expect(list.find((item) => item.id === "303-2026-4")?.status).toBe("overdue");
  });

  it("sin fecha de alta muestra solo el año en curso", () => {
    const ids = obligationsFor("2026-10-10", settings({ activityStart: null })).map((item) => item.id);
    expect(ids[0]).toBe("303-2026-1");
    expect(ids.some((id) => id.includes("2025"))).toBe(false);
  });
});

describe("bordes del calendario", () => {
  it("lo vencido sin presentar sigue a la vista aunque pasen los años", () => {
    const list = obligationsFor("2028-03-01", settings());
    expect(list.find((item) => item.id === "303-2026-4")?.status).toBe("overdue");
    expect(list.find((item) => item.id === "100-2026")?.status).toBe("overdue");
  });

  it("el último día del plazo sigue abierto y el siguiente ya está vencido", () => {
    expect(obligationsFor("2027-01-30", settings())[0]).toMatchObject({ id: "303-2026-4", status: "open" });
    expect(obligationsFor("2027-01-31", settings())[0]).toMatchObject({ id: "303-2026-4", status: "overdue" });
  });

  it("el 390 tiene etapas y la renta no", () => {
    expect(obligationsFor("2027-01-15", settings()).find((item) => item.id === "390-2026")?.stage).toBe("file");
    expect(obligationsFor("2027-05-15", settings()).find((item) => item.id === "100-2026")).toMatchObject({ status: "open", stage: null });
  });
});
