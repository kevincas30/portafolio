import { describe, expect, it } from "vitest";
import { defaultFinanceSettings } from "@/lib/finance/defaults";
import { dateInMonth, monthRange, shiftMonth } from "@/lib/finance/months";
import { nextRecurringDate, resumeRule, runRecurring } from "@/lib/finance/recurring";
import { antRules, budgetState, change, isAntExpense, monthSummary, monthTotals } from "@/lib/finance/summary";
import type { FinanceEntry, FinanceSettings, RecurringRule } from "@/types/finance";

let counter = 0;
function entry(partial: Partial<FinanceEntry>): FinanceEntry {
  counter += 1;
  return {
    id: `e${counter}`, kind: "expense", amount: 1000, date: "2026-10-05", categoryId: "supermercado",
    note: "", recurringId: null, createdAt: "", updatedAt: "", ...partial,
  };
}

function settings(overrides: Partial<FinanceSettings> = {}): FinanceSettings {
  return { ...defaultFinanceSettings(), ...overrides };
}

describe("months", () => {
  it("avanza y retrocede cruzando el anio", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(monthRange("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("ajusta el dia a meses cortos", () => {
    expect(dateInMonth("2026-02", 31)).toBe("2026-02-28");
    expect(dateInMonth("2028-02", 31)).toBe("2028-02-29");
    expect(dateInMonth("2026-10", 5)).toBe("2026-10-05");
  });
});

describe("monthSummary", () => {
  const entries = [
    entry({ kind: "income", amount: 250000, categoryId: "clientes" }),
    entry({ amount: 6000, categoryId: "supermercado" }),
    entry({ amount: 350, categoryId: "cafe" }),
    entry({ amount: 280, categoryId: "cafe", date: "2026-10-09" }),
    entry({ amount: 900, categoryId: "suscripciones", recurringId: "r1" }),
    entry({ amount: 9999, date: "2026-09-30" }),
  ];

  it("suma ingresos, gastos y balance solo del mes pedido", () => {
    const summary = monthSummary(entries, "2026-10", settings(), "2026-10-10");
    expect(summary.income).toBe(250000);
    expect(summary.expense).toBe(7530);
    expect(summary.balance).toBe(242470);
  });

  it("cuenta como hormiga los gastos chicos sueltos, no los fijos", () => {
    const summary = monthSummary(entries, "2026-10", settings(), "2026-10-10");
    expect(summary.ant).toEqual({ count: 2, total: 630 });
  });

  it("media diaria y proyeccion solo para el mes en curso", () => {
    const current = monthSummary(entries, "2026-10", settings(), "2026-10-10");
    expect(current.dailyAverage).toBe(753);
    expect(current.projectedExpense).toBe(23343);
    const past = monthSummary(entries, "2026-09", settings(), "2026-10-10");
    expect(past.dailyAverage).toBe(333);
    expect(past.projectedExpense).toBeNull();
  });

  it("ordena por categoria y calcula el uso del presupuesto, incluso sin gastos", () => {
    const base = defaultFinanceSettings();
    const categories = base.categories.map((category) =>
      category.id === "cafe" ? { ...category, budget: 500 } : category.id === "ropa" ? { ...category, budget: 3000 } : category);
    const summary = monthSummary(entries, "2026-10", settings({ categories }), "2026-10-10");
    expect(summary.expenseByCategory.map((row) => row.categoryId)).toEqual(["supermercado", "suscripciones", "cafe", "ropa"]);
    const cafe = summary.expenseByCategory.find((row) => row.categoryId === "cafe")!;
    expect(cafe.ratio).toBeCloseTo(1.26);
    expect(budgetState(cafe.ratio)).toBe("over");
    expect(summary.expenseByCategory.find((row) => row.categoryId === "ropa")).toMatchObject({ total: 0, ratio: 0 });
  });

  it("una categoria borrada queda como null", () => {
    const summary = monthSummary([entry({ categoryId: "ya-no-existe" })], "2026-10", settings(), "2026-10-10");
    expect(summary.expenseByCategory[0].category).toBeNull();
  });
});

describe("isAntExpense", () => {
  const rules = antRules(defaultFinanceSettings());

  it("tope de 15 € y solo en categorias evitables", () => {
    expect(rules.threshold).toBe(1500);
    expect(isAntExpense(entry({ amount: 180, categoryId: "cafe" }), rules)).toBe(true);
    expect(isAntExpense(entry({ amount: 1500, categoryId: "comida" }), rules)).toBe(true);
    expect(isAntExpense(entry({ amount: 1501, categoryId: "comida" }), rules)).toBe(false);
  });

  it("el internet de 10 € anotado a mano no es hormiga, ni el super chico", () => {
    expect(isAntExpense(entry({ amount: 1000, categoryId: "servicios" }), rules)).toBe(false);
    expect(isAntExpense(entry({ amount: 900, categoryId: "supermercado" }), rules)).toBe(false);
  });

  it("los fijos y los ingresos nunca son hormiga", () => {
    expect(isAntExpense(entry({ amount: 299, categoryId: "suscripciones", recurringId: "r1" }), rules)).toBe(false);
    expect(isAntExpense(entry({ kind: "income", amount: 500, categoryId: "cafe" }), rules)).toBe(false);
  });
});

describe("budgetState y change", () => {
  it("avisa desde el 80 % y marca pasado por encima del 100 %", () => {
    expect(budgetState(null)).toBe("ok");
    expect(budgetState(0.79)).toBe("ok");
    expect(budgetState(0.8)).toBe("warn");
    expect(budgetState(1)).toBe("warn");
    expect(budgetState(1.01)).toBe("over");
  });

  it("compara contra el mes anterior", () => {
    expect(change(150, 100)).toBeCloseTo(0.5);
    expect(change(50, 0)).toBeNull();
  });
});

describe("monthTotals", () => {
  it("devuelve un total por mes pedido, con ceros en los meses vacios", () => {
    const totals = monthTotals(
      [entry({ amount: 100 }), entry({ kind: "income", amount: 500, date: "2026-08-01" })],
      ["2026-08", "2026-09", "2026-10"],
    );
    expect(totals).toEqual([
      { month: "2026-08", income: 500, expense: 0 },
      { month: "2026-09", income: 0, expense: 0 },
      { month: "2026-10", income: 0, expense: 100 },
    ]);
  });
});

describe("runRecurring", () => {
  const rule: RecurringRule = {
    id: "alquiler", kind: "expense", amount: 80000, categoryId: "casa", note: "Alquiler",
    day: 1, startMonth: "2026-08", generatedThrough: null, active: true,
  };
  const ids = () => { let n = 0; return () => `n${++n}`; };

  it("anota los meses pendientes hasta hoy y avanza generatedThrough", () => {
    const run = runRecurring([rule], "2026-10-15", ids());
    expect(run.entries.map((item) => item.date)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
    expect(run.entries[0]).toMatchObject({ kind: "expense", amount: 80000, categoryId: "casa", recurringId: "alquiler", note: "Alquiler" });
    expect(run.rules[0].generatedThrough).toBe("2026-10");
  });

  it("no anota el mes en curso si todavia no llego el dia", () => {
    const run = runRecurring([{ ...rule, day: 20, generatedThrough: "2026-09" }], "2026-10-15", ids());
    expect(run.entries).toEqual([]);
    expect(run.rules[0].generatedThrough).toBe("2026-09");
  });

  it("es idempotente y respeta las reglas pausadas", () => {
    const first = runRecurring([rule], "2026-10-15", ids());
    expect(runRecurring(first.rules, "2026-10-15", ids()).entries).toEqual([]);
    expect(runRecurring([{ ...rule, active: false }], "2026-10-15", ids()).entries).toEqual([]);
  });

  it("no anota mas de 24 meses de golpe", () => {
    const run = runRecurring([{ ...rule, startMonth: "2020-01" }], "2026-10-15", ids());
    expect(run.entries).toHaveLength(24);
    expect(run.rules[0].generatedThrough).toBe("2021-12");
  });

  it("al reanudar no anota los meses en pausa, pero si el mes en curso", () => {
    const paused = { ...rule, active: false, generatedThrough: "2026-03" };
    const resumed = resumeRule(paused, "2026-10-15");
    expect(resumed).toMatchObject({ active: true, generatedThrough: "2026-09" });
    expect(runRecurring([resumed], "2026-10-15", ids()).entries.map((item) => item.date)).toEqual(["2026-10-01"]);
  });

  it("al reanudar una regla que arranca en el futuro no toca generatedThrough", () => {
    const future = { ...rule, active: false, startMonth: "2026-12" };
    expect(resumeRule(future, "2026-10-15").generatedThrough).toBeNull();
  });

  it("calcula la proxima fecha", () => {
    expect(nextRecurringDate({ ...rule, day: 31, generatedThrough: "2027-01" })).toBe("2027-02-28");
    expect(nextRecurringDate(rule)).toBe("2026-08-01");
  });
});
