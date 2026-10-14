import { json, noStore } from "@/lib/api-response";

export function fail(error: string, status: number, headers: Record<string, string> = {}): Response {
  return json({ error }, { status, headers: { ...noStore, ...headers } });
}

export function ok(data: unknown, status = 200): Response {
  return json(data, { status, headers: noStore });
}

/** Lee el JSON del request como objeto plano; null si no es un objeto valido. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

export const isText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;
