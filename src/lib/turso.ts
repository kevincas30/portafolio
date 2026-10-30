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
      `CREATE TABLE IF NOT EXISTS vault_users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE COLLATE NOCASE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
          recovery_auth_hash TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS webauthn_credentials (
          credential_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES vault_users(id),
          public_key TEXT NOT NULL,
          counter INTEGER NOT NULL DEFAULT 0,
          transports TEXT NOT NULL DEFAULT '',
          prf_capable INTEGER NOT NULL DEFAULT 0,
          label TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_used_at TEXT
        )`,
      `CREATE TABLE IF NOT EXISTS vault_key_wrappers (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES vault_users(id),
          kind TEXT NOT NULL CHECK (kind IN ('passkey', 'recovery')),
          webauthn_credential_id TEXT UNIQUE REFERENCES webauthn_credentials(credential_id),
          version INTEGER NOT NULL DEFAULT 1,
          kdf TEXT NOT NULL CHECK (kdf IN ('hkdf-sha256', 'pbkdf2-sha256')),
          kdf_salt TEXT NOT NULL,
          kdf_iters INTEGER,
          iv TEXT NOT NULL,
          wrapped_dek TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS vault_sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES vault_users(id),
          panel_token_hash TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL DEFAULT 0
        )`,
      `CREATE TABLE IF NOT EXISTS webauthn_challenges (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          purpose TEXT NOT NULL CHECK (purpose IN ('register', 'authenticate', 'step_up')),
          challenge TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        )`,
      `CREATE TABLE IF NOT EXISTS login_attempts (
          key TEXT PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 0,
          window_expires_at INTEGER NOT NULL
        )`,
      `CREATE TABLE IF NOT EXISTS panel_auth (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          password_hash TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS vault_user_settings (
          user_id TEXT PRIMARY KEY REFERENCES vault_users(id),
          payload TEXT NOT NULL,
          payload_iv TEXT NOT NULL,
          payload_version INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      // Finanzas personales: cada fila es un blob cifrado con la DEK del usuario.
      `CREATE TABLE IF NOT EXISTS finance_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES vault_users(id),
          payload TEXT NOT NULL,
          payload_iv TEXT NOT NULL,
          payload_version INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS finance_settings (
          user_id TEXT PRIMARY KEY REFERENCES vault_users(id),
          payload TEXT NOT NULL,
          payload_iv TEXT NOT NULL,
          payload_version INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      // Autonomo: facturas registradas y ajustes, tambien cifrados con la DEK.
      `CREATE TABLE IF NOT EXISTS autonomo_invoices (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES vault_users(id),
          payload TEXT NOT NULL,
          payload_iv TEXT NOT NULL,
          payload_version INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      `CREATE TABLE IF NOT EXISTS autonomo_settings (
          user_id TEXT PRIMARY KEY REFERENCES vault_users(id),
          payload TEXT NOT NULL,
          payload_iv TEXT NOT NULL,
          payload_version INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      "CREATE INDEX IF NOT EXISTS autonomo_invoices_user_id_idx ON autonomo_invoices(user_id)",
      "CREATE INDEX IF NOT EXISTS credentials_name_idx ON credentials(name)",
      "CREATE INDEX IF NOT EXISTS credentials_group_name_idx ON credentials(group_name)",
      "CREATE INDEX IF NOT EXISTS payments_subscription_id_idx ON payments(subscription_id)",
      "CREATE INDEX IF NOT EXISTS subscriptions_client_id_idx ON subscriptions(client_id)",
      "CREATE INDEX IF NOT EXISTS subscriptions_next_due_date_idx ON subscriptions(next_due_date)",
      "CREATE INDEX IF NOT EXISTS webauthn_credentials_user_id_idx ON webauthn_credentials(user_id)",
      "CREATE INDEX IF NOT EXISTS vault_key_wrappers_user_id_idx ON vault_key_wrappers(user_id)",
      "CREATE INDEX IF NOT EXISTS vault_sessions_expires_at_idx ON vault_sessions(expires_at)",
      "CREATE INDEX IF NOT EXISTS finance_entries_user_id_idx ON finance_entries(user_id)",
    ], "write");

    const paymentColumns = await client.execute("PRAGMA table_info(payments)");
    const hasPeriods = paymentColumns.rows.some((row) => String(row.name) === "periods");
    if (!hasPeriods) {
      await client.execute("ALTER TABLE payments ADD COLUMN periods INTEGER NOT NULL DEFAULT 1");
    }

    // Responsables del cliente: ids del equipo separados por coma ('' = sin asignar).
    const clientColumns = await client.execute("PRAGMA table_info(clients)");
    if (!clientColumns.rows.some((row) => String(row.name) === "owners")) {
      await client.execute("ALTER TABLE clients ADD COLUMN owners TEXT NOT NULL DEFAULT ''");
    }

    // Logo del cliente (data: URL sacada de su web).
    if (!clientColumns.rows.some((row) => String(row.name) === "logo")) {
      await client.execute("ALTER TABLE clients ADD COLUMN logo TEXT NOT NULL DEFAULT ''");
    }

    // Momento del desbloqueo: las sesiones previas quedan en 0 (nunca cuentan como recientes).
    const sessionColumns = await client.execute("PRAGMA table_info(vault_sessions)");
    if (!sessionColumns.rows.some((row) => String(row.name) === "created_at")) {
      await client.execute("ALTER TABLE vault_sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0");
    }

    // Boveda por usuario: columnas nuevas en credentials (las legacy no se tocan).
    const credentialColumns = await client.execute("PRAGMA table_info(credentials)");
    const existing = new Set(credentialColumns.rows.map((row) => String(row.name)));
    const additions: Array<[string, string]> = [
      ["user_id", "TEXT"],
      ["payload", "TEXT"],
      ["payload_iv", "TEXT"],
      ["payload_version", "INTEGER"],
    ];
    for (const [column, type] of additions) {
      if (!existing.has(column)) {
        await client.execute(`ALTER TABLE credentials ADD COLUMN ${column} ${type}`);
      }
    }
    await client.execute("CREATE INDEX IF NOT EXISTS credentials_user_id_idx ON credentials(user_id)");
  })();

  await schemaPromise;
  return client;
}
