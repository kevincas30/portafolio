import { createClient, type Client } from "@libsql/client";

let database: Client | undefined;
let schemaPromise: Promise<void> | undefined;

export class TursoConfigurationError extends Error {
  constructor() {
    super("Turso no está configurado");
    this.name = "TursoConfigurationError";
  }
}

function getClient(): Client {
  if (database) return database;

  const url = import.meta.env.TURSO_DATABASE_URL;
  const authToken = import.meta.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) throw new TursoConfigurationError();

  database = createClient({ url, authToken });
  return database;
}

export async function getTurso(): Promise<Client> {
  const client = getClient();

  schemaPromise ??= (async () => {
    await client.batch([
      `CREATE TABLE IF NOT EXISTS vault_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          salt TEXT NOT NULL,
          verifier_ciphertext TEXT NOT NULL,
          verifier_iv TEXT NOT NULL,
          kdf_iterations INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS site_sessions (
          token_hash TEXT PRIMARY KEY,
          expires_at INTEGER NOT NULL
        )`,
      `CREATE TABLE IF NOT EXISTS credentials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          platform TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT '',
          group_name TEXT NOT NULL DEFAULT '',
          url TEXT NOT NULL DEFAULT '',
          provider TEXT,
          login_method TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT '',
          username TEXT NOT NULL DEFAULT '',
          encrypted_password TEXT,
          password_iv TEXT,
          login_credential_id TEXT,
          email_credential_id TEXT,
          access_instructions TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          favorite INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (login_credential_id) REFERENCES credentials(id),
          FOREIGN KEY (email_credential_id) REFERENCES credentials(id)
        )`,
      `CREATE TABLE IF NOT EXISTS credential_group_settings (
          name TEXT PRIMARY KEY COLLATE NOCASE,
          hidden INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 999,
          color TEXT NOT NULL DEFAULT '#9CA3AF',
          color_customized INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          client_name TEXT NOT NULL,
          business_name TEXT NOT NULL DEFAULT '',
          website_url TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id),
          type TEXT NOT NULL,
          label TEXT NOT NULL DEFAULT '',
          billing_interval TEXT NOT NULL,
          amount REAL NOT NULL DEFAULT 0,
          next_due_date TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
          amount REAL NOT NULL,
          paid_at TEXT NOT NULL,
          periods INTEGER NOT NULL DEFAULT 1,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      "CREATE INDEX IF NOT EXISTS credentials_name_idx ON credentials(name)",
      "CREATE INDEX IF NOT EXISTS credentials_group_name_idx ON credentials(group_name)",
      "CREATE INDEX IF NOT EXISTS payments_subscription_id_idx ON payments(subscription_id)",
      "CREATE INDEX IF NOT EXISTS subscriptions_client_id_idx ON subscriptions(client_id)",
      "CREATE INDEX IF NOT EXISTS subscriptions_next_due_date_idx ON subscriptions(next_due_date)",
    ], "write");

    const paymentColumns = await client.execute("PRAGMA table_info(payments)");
    const hasPeriods = paymentColumns.rows.some((row) => String(row.name) === "periods");
    if (!hasPeriods) {
      await client.execute("ALTER TABLE payments ADD COLUMN periods INTEGER NOT NULL DEFAULT 1");
    }
  })();

  await schemaPromise;
  return client;
}
