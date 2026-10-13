import type { APIRoute } from "astro";
import { json } from "@/lib/api-response";
import { addInterval, getTodayKey } from "@/lib/dates";
import { getTurso, TursoConfigurationError } from "@/lib/turso";
import type { BillingInterval, Payment, Subscription } from "@/types/client";

export const prerender = false;

const MAX_PERIODS = 60;

function databaseError(error: unknown) {
  const message = error instanceof TursoConfigurationError
    ? "Turso no está configurado."
    : "No se pudo registrar el pago.";
  if (!(error instanceof TursoConfigurationError)) console.error("Payments database error:", error);
  return json({ error: message }, { status: 503 });
}

function rowToSubscription(row: Record<string, unknown>): Omit<Subscription, "payments"> {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    type: row.type === "domain" ? "domain" : "maintenance",
    label: String(row.label),
    billingInterval: row.billing_interval === "yearly" ? "yearly" : "monthly",
    amount: Number(row.amount),
    nextDueDate: String(row.next_due_date),
    active: Number(row.active) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    subscriptionId: String(row.subscription_id),
    amount: Number(row.amount),
    paidAt: String(row.paid_at),
    periods: Number(row.periods ?? 1),
    note: String(row.note),
    createdAt: String(row.created_at),
  };
}

async function findSubscriptionWithPayments(id: string): Promise<Subscription | null> {
  const database = await getTurso();
  const [subscriptionResult, paymentsResult] = await Promise.all([
    database.execute({ sql: "SELECT * FROM subscriptions WHERE id = ?", args: [id] }),
    database.execute({ sql: "SELECT * FROM payments WHERE subscription_id = ? ORDER BY paid_at DESC, created_at DESC", args: [id] }),
  ]);
  const row = subscriptionResult.rows[0];
  if (!row) return null;
  return {
    ...rowToSubscription(row as Record<string, unknown>),
    payments: paymentsResult.rows.map((paymentRow) => rowToPayment(paymentRow as Record<string, unknown>)),
  };
}

export const POST: APIRoute = async ({ request }) => {
  let body: { subscriptionId?: unknown; amount?: unknown; periods?: unknown; note?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }

  const periods = body.periods === undefined ? 1 : body.periods;

  if (
    typeof body.subscriptionId !== "string" || body.subscriptionId.length === 0 ||
    typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount < 0 ||
    typeof periods !== "number" || !Number.isInteger(periods) || periods < 1 || periods > MAX_PERIODS ||
    typeof body.note !== "string" || body.note.length > 2000
  ) {
    return json({ error: "Revisa el monto y la cantidad de periodos del pago." }, { status: 400 });
  }

  try {
    const database = await getTurso();
    const subscriptionResult = await database.execute({ sql: "SELECT next_due_date, billing_interval FROM subscriptions WHERE id = ?", args: [body.subscriptionId] });
    const subscriptionRow = subscriptionResult.rows[0];
    if (!subscriptionRow) return json({ error: "El servicio no existe." }, { status: 404 });

    const paidAt = getTodayKey();
    const billingInterval = (subscriptionRow.billing_interval === "yearly" ? "yearly" : "monthly") as BillingInterval;
    const nextDueDate = addInterval(String(subscriptionRow.next_due_date), billingInterval, periods);

    await database.batch([
      {
        sql: "INSERT INTO payments (id, subscription_id, amount, paid_at, periods, note) VALUES (?, ?, ?, ?, ?, ?)",
        args: [crypto.randomUUID(), body.subscriptionId, body.amount, paidAt, periods, body.note.trim()],
      },
      {
        sql: "UPDATE subscriptions SET next_due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [nextDueDate, body.subscriptionId],
      },
    ], "write");

    return json({ subscription: await findSubscriptionWithPayments(body.subscriptionId) }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return json({ error: "Petición no válida." }, { status: 400 });
  }
  if (typeof body.id !== "string" || body.id.length === 0) {
    return json({ error: "Pago no válido." }, { status: 400 });
  }

  try {
    const database = await getTurso();
    const paymentResult = await database.execute({ sql: "SELECT subscription_id, periods FROM payments WHERE id = ?", args: [body.id] });
    const subscriptionId = paymentResult.rows[0]?.subscription_id;
    const periods = Number(paymentResult.rows[0]?.periods ?? 1);
    if (!subscriptionId) return json({ error: "El pago no existe." }, { status: 404 });

    const subscriptionResult = await database.execute({ sql: "SELECT next_due_date, billing_interval FROM subscriptions WHERE id = ?", args: [subscriptionId] });
    const subscriptionRow = subscriptionResult.rows[0];
    const billingInterval = (subscriptionRow?.billing_interval === "yearly" ? "yearly" : "monthly") as BillingInterval;
    const nextDueDate = subscriptionRow ? addInterval(String(subscriptionRow.next_due_date), billingInterval, -periods) : undefined;

    const statements = [{ sql: "DELETE FROM payments WHERE id = ?", args: [body.id] }];
    if (nextDueDate) {
      statements.push({
        sql: "UPDATE subscriptions SET next_due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [nextDueDate, String(subscriptionId)],
      });
    }
    await database.batch(statements, "write");

    return json({ subscription: await findSubscriptionWithPayments(String(subscriptionId)) });
  } catch (error) {
    return databaseError(error);
  }
};
