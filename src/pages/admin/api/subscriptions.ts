import type { APIRoute } from "astro";
import { json } from "@/lib/api-response";
import { billingIntervalFor } from "@/config/subscription-types";
import { getTurso, TursoConfigurationError } from "@/lib/turso";
import type { Subscription, SubscriptionPayload, SubscriptionType } from "@/types/client";

export const prerender = false;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TYPES = new Set<SubscriptionType>(["maintenance", "domain"]);

function databaseError(error: unknown) {
  const message = error instanceof TursoConfigurationError
    ? "Turso no está configurado."
    : "No se pudo acceder a los servicios.";
  if (!(error instanceof TursoConfigurationError)) console.error("Subscriptions database error:", error);
  return json({ error: message }, { status: 503 });
}

function stringWithin(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isSubscriptionPayload(value: unknown): value is Omit<SubscriptionPayload, "billingInterval"> {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SubscriptionPayload>;
  return (
    stringWithin(item.id, 128) && item.id.length > 0 &&
    stringWithin(item.clientId, 128) && item.clientId.length > 0 &&
    typeof item.type === "string" && VALID_TYPES.has(item.type as SubscriptionType) &&
    stringWithin(item.label, 160) &&
    typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount >= 0 &&
    stringWithin(item.nextDueDate, 10) && DATE_PATTERN.test(item.nextDueDate) &&
    typeof item.active === "boolean"
  );
}

function rowToSubscription(row: Record<string, unknown>): Subscription {
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
    payments: [],
  };
}

async function findSubscription(id: string): Promise<Subscription | null> {
  const database = await getTurso();
  const [subscriptionResult, paymentsResult] = await Promise.all([
    database.execute({ sql: "SELECT * FROM subscriptions WHERE id = ?", args: [id] }),
    database.execute({ sql: "SELECT * FROM payments WHERE subscription_id = ? ORDER BY paid_at DESC, created_at DESC", args: [id] }),
  ]);
  const row = subscriptionResult.rows[0];
  if (!row) return null;
  const subscription = rowToSubscription(row as Record<string, unknown>);
  subscription.payments = paymentsResult.rows.map((paymentRow) => ({
    id: String(paymentRow.id),
    subscriptionId: String(paymentRow.subscription_id),
    amount: Number(paymentRow.amount),
    paidAt: String(paymentRow.paid_at),
    periods: Number(paymentRow.periods ?? 1),
    note: String(paymentRow.note),
    createdAt: String(paymentRow.created_at),
  }));
  return subscription;
}

async function parsePayload(request: Request) {
  try {
    const body: unknown = await request.json();
    return isSubscriptionPayload(body) ? body : null;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);
  if (!payload) return json({ error: "Datos de servicio no válidos." }, { status: 400 });

  try {
    const database = await getTurso();
    const client = await database.execute({ sql: "SELECT id FROM clients WHERE id = ?", args: [payload.clientId] });
    if (client.rows.length === 0) return json({ error: "El cliente no existe." }, { status: 404 });

    const billingInterval = billingIntervalFor(payload.type as SubscriptionType);
    await database.execute({
      sql: `INSERT INTO subscriptions (id, client_id, type, label, billing_interval, amount, next_due_date, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [payload.id, payload.clientId, payload.type, payload.label.trim(), billingInterval, payload.amount, payload.nextDueDate, payload.active ? 1 : 0],
    });
    return json({ subscription: await findSubscription(payload.id) }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);
  if (!payload) return json({ error: "Datos de servicio no válidos." }, { status: 400 });

  try {
    const database = await getTurso();
    const existing = await findSubscription(payload.id);
    if (!existing) return json({ error: "El servicio no existe." }, { status: 404 });

    const billingInterval = billingIntervalFor(payload.type as SubscriptionType);
    await database.execute({
      sql: `UPDATE subscriptions SET type = ?, label = ?, billing_interval = ?, amount = ?, next_due_date = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [payload.type, payload.label.trim(), billingInterval, payload.amount, payload.nextDueDate, payload.active ? 1 : 0, payload.id],
    });
    return json({ subscription: await findSubscription(payload.id) });
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
    return json({ error: "Servicio no válido." }, { status: 400 });
  }

  try {
    const database = await getTurso();
    await database.batch([
      { sql: "DELETE FROM payments WHERE subscription_id = ?", args: [body.id] },
      { sql: "DELETE FROM subscriptions WHERE id = ?", args: [body.id] },
    ], "write");
    return json({ ok: true, id: body.id });
  } catch (error) {
    return databaseError(error);
  }
};
