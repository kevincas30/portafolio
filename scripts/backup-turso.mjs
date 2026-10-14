// Backup de la base Turso a un archivo JSON fuera del repo.
// Uso: node --env-file=.env scripts/backup-turso.mjs [carpeta-destino]
// Lee TURSO_DATABASE_URL y TURSO_AUTH_TOKEN del entorno; solo imprime nombres de tablas y conteos.
import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN. Ejecutalo con: node --env-file=.env scripts/backup-turso.mjs");
  process.exit(1);
}

const database = createClient({ url, authToken });
const { rows: tables } = await database.execute(
  "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name",
);

const backup = { createdAt: new Date().toISOString(), tables: {} };
for (const table of tables) {
  const name = String(table.name);
  const { rows } = await database.execute(`SELECT * FROM "${name.replaceAll('"', '""')}"`);
  backup.tables[name] = { schema: String(table.sql), rows: rows.map((row) => ({ ...row })) };
  console.log(`${name.padEnd(28)} ${rows.length} filas`);
}

const folder = process.argv[2] ?? join(homedir(), "Backups", "turso");
mkdirSync(folder, { recursive: true });
const file = join(folder, `clientes-discreativo-${backup.createdAt.replaceAll(":", "-")}.json`);
writeFileSync(file, JSON.stringify(backup, null, 2), { mode: 0o600 });
console.log(`\nBackup guardado en: ${file}`);
