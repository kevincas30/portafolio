import { describe, expect, it } from "vitest";
import { monthCells, periodStates, yearCells } from "@/lib/payment-calendar";
import type { Payment } from "@/types/client";

function payment(periods: number): Payment {
  return { id: "p", subscriptionId: "s", amount: 15, paidAt: "2026-10-13", periods, note: "", createdAt: "" };
}

const month = (year: number, monthNumber: number) => year * 12 + monthNumber - 1;

describe("periodStates (mensual)", () => {
  it("al dia: los meses pagados en verde y el proximo cobro en naranja", () => {
    // Pago de 6 meses que llevo el vencimiento de 11 oct 2026 a 11 abr 2027.
    const states = periodStates(
      { nextDueDate: "2027-04-11", billingInterval: "monthly", active: true, payments: [payment(6)] },
      "2026-10-15",
    );
    expect(states.get(month(2026, 10))).toBe("paid");
    expect(states.get(month(2027, 3))).toBe("paid");
    expect(states.get(month(2027, 4))).toBe("due");
    expect(states.get(month(2026, 9))).toBeUndefined();
    expect(states.get(month(2027, 5))).toBeUndefined();
  });

  it("atrasado: rojo desde el vencimiento hasta hoy y naranja el siguiente", () => {
    const states = periodStates(
      { nextDueDate: "2026-08-05", billingInterval: "monthly", active: true, payments: [payment(1)] },
      "2026-10-15",
    );
    expect(states.get(month(2026, 7))).toBe("paid");
    expect(states.get(month(2026, 8))).toBe("overdue");
    expect(states.get(month(2026, 9))).toBe("overdue");
    expect(states.get(month(2026, 10))).toBe("overdue");
    expect(states.get(month(2026, 11))).toBe("due");
  });

  it("si vence hoy todavia es naranja, no rojo", () => {
    const states = periodStates(
      { nextDueDate: "2026-10-15", billingInterval: "monthly", active: true, payments: [] },
      "2026-10-15",
    );
    expect(states.get(month(2026, 10))).toBe("due");
  });

  it("el vencimiento del 31 se ajusta a meses cortos", () => {
    const states = periodStates(
      { nextDueDate: "2026-01-31", billingInterval: "monthly", active: true, payments: [] },
      "2026-02-28",
    );
    expect(states.get(month(2026, 1))).toBe("overdue");
    expect(states.get(month(2026, 2))).toBe("due");
  });

  it("un servicio pausado solo muestra lo pagado", () => {
    const states = periodStates(
      { nextDueDate: "2026-01-05", billingInterval: "monthly", active: false, payments: [payment(2)] },
      "2026-10-15",
    );
    expect([...states.values()]).toEqual(["paid", "paid"]);
  });
});

describe("monthCells", () => {
  it("devuelve los 12 meses del anio pedido", () => {
    const cells = monthCells(
      { nextDueDate: "2027-04-11", billingInterval: "monthly", active: true, payments: [payment(6)] },
      2026,
      "2026-10-15",
    );
    expect(cells).toHaveLength(12);
    expect(cells.map((cell) => cell.state)).toEqual([
      "idle", "idle", "idle", "idle", "idle", "idle", "idle", "idle", "idle", "paid", "paid", "paid",
    ]);
  });
});

describe("yearCells (anual)", () => {
  it("va del primer anio pagado al proximo cobro", () => {
    const cells = yearCells(
      { nextDueDate: "2027-10-12", billingInterval: "yearly", active: true, payments: [payment(1)] },
      "2026-10-15",
    );
    expect(cells).toEqual([
      { month: month(2026, 10), state: "paid" },
      { month: month(2027, 10), state: "due" },
    ]);
  });

  it("atrasado varios anios: los vencidos en rojo", () => {
    const cells = yearCells(
      { nextDueDate: "2024-03-01", billingInterval: "yearly", active: true, payments: [] },
      "2026-10-15",
    );
    expect(cells.map((cell) => cell.state)).toEqual(["overdue", "overdue", "overdue", "due"]);
  });
});
