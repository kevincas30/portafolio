import type { APIRoute } from "astro";
import { json, noStore } from "@/lib/api-response";
import { getTurso, TursoConfigurationError } from "@/lib/turso";

export const prerender = false;

function databaseError(error: unknown) {
  const message = error instanceof TursoConfigurationError
    ? "Turso no está configurado."
    : "No se pudieron actualizar los grupos.";
  if (!(error instanceof TursoConfigurationError)) console.error("Credential groups database error:", error);
  return json({ error: message }, { status: 503 });
}

function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 160;
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export const GET: APIRoute = async () => {
  try {
    const database = await getTurso();
    const [settings, credentialGroups] = await Promise.all([
      database.execute("SELECT name, hidden, sort_order, color FROM credential_group_settings ORDER BY sort_order, name COLLATE NOCASE"),
      database.execute("SELECT DISTINCT trim(group_name) AS name FROM credentials WHERE trim(group_name) <> '' ORDER BY name COLLATE NOCASE"),
    ]);
    const settingByName = new Map(settings.rows.map((row) => [String(row.name).toLocaleLowerCase("es"), row]));
    const groups = settings.rows
      .filter((row) => Number(row.hidden) === 0)
      .map((row) => ({ name: String(row.name), color: String(row.color) }));

    credentialGroups.rows.forEach((row) => {
      const name = String(row.name);
      const setting = settingByName.get(name.toLocaleLowerCase("es"));
      if (!setting && !groups.some((group) => group.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) {
        groups.push({ name, color: "#9CA3AF" });
      }
    });

    return json({ groups }, { headers: noStore });
  } catch (error) {
    return databaseError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: { name?: unknown; color?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; color?: unknown };
  } catch {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }
  if (!validName(body.name) || !validColor(body.color)) return json({ error: "Escribe un nombre y color válidos." }, { status: 400 });

  try {
    const database = await getTurso();
    await database.execute({
      sql: `INSERT INTO credential_group_settings (name, hidden, sort_order, color, color_customized, updated_at)
        VALUES (?, 0, 999, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(name) DO UPDATE SET name = excluded.name, color = excluded.color, color_customized = 1, hidden = 0, updated_at = CURRENT_TIMESTAMP`,
      args: [body.name.trim(), body.color],
    });
    return json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  let body: { currentName?: unknown; newName?: unknown; color?: unknown };
  try {
    body = (await request.json()) as { currentName?: unknown; newName?: unknown; color?: unknown };
  } catch {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }
  if (!validName(body.currentName) || !validName(body.newName) || !validColor(body.color)) {
    return json({ error: "Escribe un nombre y color válidos." }, { status: 400 });
  }

  const currentName = body.currentName.trim();
  const newName = body.newName.trim();
  try {
    const database = await getTurso();
    const duplicate = await database.execute({
      sql: "SELECT name FROM credential_group_settings WHERE lower(trim(name)) = lower(trim(?)) AND lower(trim(name)) <> lower(trim(?)) AND hidden = 0 LIMIT 1",
      args: [newName, currentName],
    });
    if (duplicate.rows.length > 0) {
      return json({ error: "Ya existe un grupo con ese nombre." }, { status: 409 });
    }

    await database.batch([
      {
        sql: `INSERT INTO credential_group_settings (name, hidden, sort_order, updated_at)
          VALUES (?, 1, 999, CURRENT_TIMESTAMP)
          ON CONFLICT(name) DO UPDATE SET hidden = 1, updated_at = CURRENT_TIMESTAMP`,
        args: [currentName],
      },
      {
        sql: `INSERT INTO credential_group_settings (name, hidden, sort_order, color, color_customized, updated_at)
          VALUES (?, 0, 999, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(name) DO UPDATE SET name = excluded.name, color = excluded.color, color_customized = 1, hidden = 0, updated_at = CURRENT_TIMESTAMP`,
        args: [newName, body.color],
      },
      {
        sql: "UPDATE credentials SET group_name = ?, updated_at = CURRENT_TIMESTAMP WHERE lower(trim(group_name)) = lower(trim(?))",
        args: [newName, currentName],
      },
    ], "write");
    return json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  let body: { name?: unknown };
  try {
    body = (await request.json()) as { name?: unknown };
  } catch {
    return json({ error: "Datos no válidos." }, { status: 400 });
  }
  if (!validName(body.name)) return json({ error: "Grupo no válido." }, { status: 400 });

  const name = body.name.trim();
  try {
    const database = await getTurso();
    await database.batch([
      {
        sql: `INSERT INTO credential_group_settings (name, hidden, sort_order, updated_at)
          VALUES (?, 1, 999, CURRENT_TIMESTAMP)
          ON CONFLICT(name) DO UPDATE SET hidden = 1, updated_at = CURRENT_TIMESTAMP`,
        args: [name],
      },
      {
        sql: "UPDATE credentials SET group_name = '', updated_at = CURRENT_TIMESTAMP WHERE lower(trim(group_name)) = lower(trim(?))",
        args: [name],
      },
    ], "write");
    return json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
};
