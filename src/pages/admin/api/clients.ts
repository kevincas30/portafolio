import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { ownersFromColumn, ownersToColumn, parseOwners } from "@/lib/client-owner";
import { getTurso, TursoConfigurationError } from "@/lib/turso";
import type { Client, ClientPayload, Payment, Subscription } from "@/types/client";

export const prerender = false;

function databaseError(error: unknown) {
  const message = error instanceof TursoConfigurationError
    ? "Turso no está configurado."
    : "No se pudo acceder a los clientes.";
  if (!(error instanceof TursoConfigurationError)) console.error("Clients database error:", error);
  return json({ error: message }, { status: 503 });
}

function stringWithin(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function validUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isClientPayload(value: unknown): value is ClientPayload {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ClientPayload>;
  return (
    stringWithin(item.id, 128) && item.id.length > 0 &&
    stringWithin(item.clientName, 200) && item.clientName.trim().length > 0 &&
    stringWithin(item.businessName, 200) &&
    stringWithin(item.websiteUrl, 2048) && validUrl(item.websiteUrl) &&
    stringWithin(item.notes, 4000) &&
    // Opcional: una pestana con el panel viejo no lo manda y el PUT conserva los responsables actuales.
    (item.owners === undefined || parseOwners(item.owners) !== null)
  );
}

function rowToClient(row: Record<string, unknown>): Omit<Client, "subscriptions"> {
  return {
    id: String(row.id),
    clientName: String(row.client_name),
    businessName: String(row.business_name),
    websiteUrl: String(row.website_url),
    notes: String(row.notes),
    owners: ownersFromColumn(row.owners),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
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

export const GET: APIRoute = async () => {
  try {
    const database = await getTurso();
    const [clientsResult, subscriptionsResult, paymentsResult] = await Promise.all([
      database.execute("SELECT * FROM clients ORDER BY client_name COLLATE NOCASE"),
      database.execute("SELECT * FROM subscriptions"),
      database.execute("SELECT * FROM payments ORDER BY paid_at DESC, created_at DESC"),
    ]);

    const paymentsBySubscription = new Map<string, Payment[]>();
    paymentsResult.rows.forEach((row) => {
      const payment = rowToPayment(row as Record<string, unknown>);
      const list = paymentsBySubscription.get(payment.subscriptionId) ?? [];
      list.push(payment);
      paymentsBySubscription.set(payment.subscriptionId, list);
    });

    const subscriptionsByClient = new Map<string, Subscription[]>();
    subscriptionsResult.rows.forEach((row) => {
      const subscription = rowToSubscription(row as Record<string, unknown>);
      const full: Subscription = { ...subscription, payments: paymentsBySubscription.get(subscription.id) ?? [] };
      const list = subscriptionsByClient.get(subscription.clientId) ?? [];
      list.push(full);
      subscriptionsByClient.set(subscription.clientId, list);
    });
    subscriptionsByClient.forEach((list) => list.sort((first, second) => first.nextDueDate.localeCompare(second.nextDueDate)));

    const clients: Client[] = clientsResult.rows.map((row) => {
      const client = rowToClient(row as Record<string, unknown>);
      return { ...client, subscriptions: subscriptionsByClient.get(client.id) ?? [] };
    });

    return json({ clients }, { headers: noStore });
  } catch (error) {
    return databaseError(error);
  }
};

async function parsePayload(request: Request) {
  try {
    const body: unknown = await request.json();
    return isClientPayload(body) ? body : null;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);
  if (!payload) return json({ error: "Datos de cliente no válidos." }, { status: 400 });
  const owners = parseOwners(payload.owners ?? []) ?? [];

  try {
    const database = await getTurso();
    await database.execute({
      sql: "INSERT INTO clients (id, client_name, business_name, website_url, notes, owners) VALUES (?, ?, ?, ?, ?, ?)",
      args: [payload.id, payload.clientName.trim(), payload.businessName.trim(), payload.websiteUrl.trim(), payload.notes.trim(), ownersToColumn(owners)],
    });
    return json({ client: { ...rowToClient({ id: payload.id, client_name: payload.clientName.trim(), business_name: payload.businessName.trim(), website_url: payload.websiteUrl.trim(), notes: payload.notes.trim(), owners: ownersToColumn(owners), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }), subscriptions: [] } }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const payload = await parsePayload(request);
  if (!payload) return json({ error: "Datos de cliente no válidos." }, { status: 400 });

  try {
    const database = await getTurso();
    await database.execute({
      // COALESCE: si no llegan responsables (panel viejo) se conservan los que habia.
      sql: `UPDATE clients SET client_name = ?, business_name = ?, website_url = ?, notes = ?, owners = COALESCE(?, owners), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [
        payload.clientName.trim(), payload.businessName.trim(), payload.websiteUrl.trim(), payload.notes.trim(),
        payload.owners === undefined ? null : ownersToColumn(parseOwners(payload.owners) ?? []),
        payload.id,
      ],
    });
    const [clientResult, subscriptionsResult] = await Promise.all([
      database.execute({ sql: "SELECT * FROM clients WHERE id = ?", args: [payload.id] }),
      database.execute({ sql: "SELECT * FROM subscriptions WHERE client_id = ?", args: [payload.id] }),
    ]);
    const row = clientResult.rows[0];
    if (!row) return json({ error: "El cliente no existe." }, { status: 404 });

    const subscriptionIds = subscriptionsResult.rows.map((subscriptionRow) => String(subscriptionRow.id));
    const paymentsResult = subscriptionIds.length > 0
      ? await database.execute({
          sql: `SELECT * FROM payments WHERE subscription_id IN (${subscriptionIds.map(() => "?").join(",")}) ORDER BY paid_at DESC, created_at DESC`,
          args: subscriptionIds,
        })
      : { rows: [] };
    const paymentsBySubscription = new Map<string, Payment[]>();
    paymentsResult.rows.forEach((paymentRow) => {
      const payment = rowToPayment(paymentRow as Record<string, unknown>);
      const list = paymentsBySubscription.get(payment.subscriptionId) ?? [];
      list.push(payment);
      paymentsBySubscription.set(payment.subscriptionId, list);
    });
    const subscriptions: Subscription[] = subscriptionsResult.rows
      .map((subscriptionRow) => {
        const subscription = rowToSubscription(subscriptionRow as Record<string, unknown>);
        return { ...subscription, payments: paymentsBySubscription.get(subscription.id) ?? [] };
      })
      .sort((first, second) => first.nextDueDate.localeCompare(second.nextDueDate));

    return json({ client: { ...rowToClient(row as Record<string, unknown>), subscriptions } });
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
  if (typeof body.id !== "string" || body.id.length === 0 || body.id.length > 128) {
    return json({ error: "Cliente no válido." }, { status: 400 });
  }

  try {
    const database = await getTurso();
    const subscriptions = await database.execute({ sql: "SELECT id FROM subscriptions WHERE client_id = ?", args: [body.id] });
    const subscriptionIds = subscriptions.rows.map((row) => String(row.id));
    const statements = subscriptionIds.flatMap((subscriptionId) => [
      { sql: "DELETE FROM payments WHERE subscription_id = ?", args: [subscriptionId] },
    ]);
    statements.push({ sql: "DELETE FROM subscriptions WHERE client_id = ?", args: [body.id] });
    statements.push({ sql: "DELETE FROM clients WHERE id = ?", args: [body.id] });
    await database.batch(statements, "write");
    return json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
};
