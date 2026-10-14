// Rota la contrasena maestra del panel sin dejarlo nunca sin configurar (nada de DELETE FROM panel_auth).
// Uso:
//   node scripts/rotate-panel-password.mjs                         -> imprime el SQL para pegarlo en Turso
//   node --env-file=.env scripts/rotate-panel-password.mjs --apply -> lo ejecuta en la base del .env
// La contrasena se pide sin eco y nunca se imprime. Al rotar se cierran todas las sesiones abiertas.
import { randomBytes, scrypt } from "node:crypto";
import { pathToFileURL } from "node:url";

// Mismos parametros y formato que src/lib/server/panel-password.ts (lo cubre panel-password.test.ts).
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;
export const MIN_LENGTH = 10;

export function hashPanelPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$"));
    });
  });
}

export function rotationStatements(hash) {
  return [
    { sql: "UPDATE panel_auth SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", args: [hash] },
    { sql: "DELETE FROM vault_sessions", args: [] },
    { sql: "DELETE FROM site_sessions", args: [] },
  ];
}

function askHidden(prompt) {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) return Promise.reject(new Error("Ejecutalo en una terminal interactiva."));
  return new Promise((resolve, reject) => {
    let value = [];
    const finish = (callback) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      callback();
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish(() => resolve(value.join("")));
        if (char === "\u0003") return finish(() => reject(new Error("Cancelado.")));
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value.push(char);
      }
    };
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function apply(statements) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN. Usa: node --env-file=.env ...");
  const { createClient } = await import("@libsql/client");
  const database = createClient({ url, authToken });
  const tx = await database.transaction("write");
  try {
    const [update, ...cleanup] = statements;
    const result = await tx.execute(update);
    // Si no hay fila no se inserta nada: un panel sin configurar se resuelve desde la UI, no rotando.
    if (result.rowsAffected !== 1) throw new Error("No existe la fila de panel_auth: no hay nada que rotar.");
    for (const statement of cleanup) await tx.execute(statement);
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

function toSql(statement) {
  return statement.args.reduce((sql, arg) => sql.replace("?", `'${String(arg).replaceAll("'", "''")}'`), statement.sql) + ";";
}

async function main() {
  const password = await askHidden("Nueva contraseña maestra: ");
  if (password.length < MIN_LENGTH || password.length > 1024) {
    throw new Error(`Usa una contraseña de al menos ${MIN_LENGTH} caracteres.`);
  }
  if (await askHidden("Repítela: ") !== password) throw new Error("Las contraseñas no coinciden.");

  const statements = rotationStatements(await hashPanelPassword(password));
  if (process.argv.includes("--apply")) {
    await apply(statements);
    console.log("Contraseña rotada. Todas las sesiones del panel y de las bóvedas quedaron cerradas.");
    return;
  }
  console.log("\nPega esto en la consola SQL de Turso (rota la contraseña y cierra todas las sesiones):\n");
  console.log(statements.map(toSql).join("\n"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
