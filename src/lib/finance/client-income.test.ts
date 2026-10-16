import { describe, expect, it } from "vitest";
import { importClientPayments, myServices } from "@/lib/finance/client-income";
import { runRecurring } from "@/lib/finance/recurring";
import type { Client, Payment, Subscription } from "@/types/client";
import type { RecurringRule } from "@/types/finance";

function payment(id: string, amount: number, paidAt: string, periods = 1): Payment {
  return { id, subscriptionId: "s", amount, paidAt, periods, note: "", createdAt: "" };
}

function subscription(id: string, partial: Partial<Subscription> = {}): Subscription {
  return {
    id, clientId: "c", type: "maintenance", label: "", billingInterval: "monthly", amount: 15,
    nextDueDate: "2027-04-11", active: true, createdAt: "", updatedAt: "", payments: [], ...partial,
  };
}

function client(owners: string[], subscriptions: Subscription[], businessName = "Tinas Ibiza"): Client {
  return { id: "c", clientName: "Rocío & Luis", businessName, websiteUrl: "", notes: "", owners, createdAt: "", updatedAt: "", subscriptions };
}

const tinas = client(["gabriel"], [
  subscription("mant", { label: "Mantenimiento + Hosting", payments: [payment("p1", 90, "2026-10-13", 6)] }),
  subscription("dom", { type: "domain", billingInterval: "yearly", payments: [payment("p2", 15, "2026-10-13")] }),
]);

const linked = (subscriptionId: string, partial: Partial<RecurringRule> = {}): RecurringRule => ({
  id: `r-${subscriptionId}`, kind: "income", amount: 1500, categoryId: "clientes", note: "", day: 1,
  startMonth: "2026-10", generatedThrough: null, active: true, subscriptionId, ...partial,
});

const ids = () => { let n = 0; return () => `n${++n}`; };

describe("myServices", () => {
  it("lista los servicios de los clientes de los que es unico responsable", () => {
    const options = myServices([tinas, client(["kevs"], [subscription("otro")], "Otro")], "gabriel");
    expect(options.map((option) => option.label)).toEqual(["Tinas Ibiza · Dominio", "Tinas Ibiza · Mantenimiento + Hosting"]);
  });

  it("sin compartidos ni persona elegida", () => {
    expect(myServices([client(["gabriel", "kevs"], [subscription("x")])], "gabriel")).toEqual([]);
    expect(myServices([tinas], null)).toEqual([]);
  });
});

describe("importClientPayments", () => {
  it("anota los pagos registrados, historico incluido, con monto y fecha reales", () => {
    const run = importClientPayments([linked("mant"), linked("dom")], [tinas], "gabriel", ids());
    expect(run.entries).toEqual([
      { id: "n1", kind: "income", amount: 9000, date: "2026-10-13", categoryId: "clientes", note: "Tinas Ibiza · Mantenimiento + Hosting (6 periodos)", recurringId: "r-mant" },
      { id: "n2", kind: "income", amount: 1500, date: "2026-10-13", categoryId: "clientes", note: "Tinas Ibiza · Dominio", recurringId: "r-dom" },
    ]);
    expect(run.rules.map((rule) => rule.importedPaymentIds)).toEqual([["p1"], ["p2"]]);
  });

  it("no repite pagos ya importados y anota solo los nuevos", () => {
    const first = importClientPayments([linked("mant")], [tinas], "gabriel", ids());
    expect(importClientPayments(first.rules, [tinas], "gabriel", ids()).entries).toEqual([]);

    const withNew = client(["gabriel"], [subscription("mant", { label: "Mant", payments: [payment("p1", 90, "2026-10-13", 6), payment("p3", 15, "2027-04-11")] })]);
    const next = importClientPayments(first.rules, [withNew], "gabriel", ids());
    expect(next.entries.map((entry) => [entry.amount, entry.date])).toEqual([[1500, "2027-04-11"]]);
  });

  it("no importa si la regla esta pausada o el cliente ya no es suyo", () => {
    expect(importClientPayments([linked("mant", { active: false })], [tinas], "gabriel", ids()).entries).toEqual([]);
    expect(importClientPayments([linked("mant")], [tinas], "kevs", ids()).entries).toEqual([]);
  });

  it("los enlazados no se anotan por fecha en runRecurring", () => {
    expect(runRecurring([linked("mant")], "2026-10-15", ids()).entries).toEqual([]);
  });
});
