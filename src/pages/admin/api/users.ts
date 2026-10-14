import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { fail, ok, readBody } from "@/lib/server/http";
import { getTurso, TursoConfigurationError } from "@/lib/turso";

export const prerender = false;

const NAME_MAX = 40;

function databaseError(error: unknown): Response {
  if (error instanceof TursoConfigurationError) return fail("Turso no está configurado.", 503);
  console.error("Users database error:", error);
  return fail("No se pudo acceder a los usuarios.", 503);
}

// Solo nombres y estado: lo necesita el selector de usuario (VS-7).
export const GET: APIRoute = async () => {
  try {
    const database = await getTurso();
    const result = await database.execute(`
      SELECT u.id, u.name, u.status,
        EXISTS (SELECT 1 FROM vault_key_wrappers w WHERE w.user_id = u.id AND w.kind = 'passkey') AS has_passkey
      FROM vault_users u ORDER BY u.name COLLATE NOCASE
    `);
    return ok({
      users: result.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        status: String(row.status),
        hasPasskey: Number(row.has_passkey) === 1,
      })),
    });
  } catch (error) {
    return databaseError(error);
  }
};

// Crea un usuario pendiente. Si ya hay uno pendiente con ese nombre (alta interrumpida) lo reutiliza.
export const POST: APIRoute = async ({ request }) => {
  const body = await readBody(request);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > NAME_MAX) return fail(`Escribe un nombre de hasta ${NAME_MAX} caracteres.`, 400);

  try {
    const database = await getTurso();
    const existing = await database.execute({ sql: "SELECT id, name, status FROM vault_users WHERE name = ?", args: [name] });
    const row = existing.rows[0];
    if (row) {
      if (String(row.status) !== "pending") return fail("Ya existe un usuario con ese nombre.", 409);
      return ok({ user: { id: String(row.id), name: String(row.name), status: "pending", hasPasskey: false } });
    }
    const id = randomUUID();
    await database.execute({ sql: "INSERT INTO vault_users (id, name) VALUES (?, ?)", args: [id, name] });
    return ok({ user: { id, name, status: "pending", hasPasskey: false } }, 201);
  } catch (error) {
    return databaseError(error);
  }
};
