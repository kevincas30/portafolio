import { createHash } from "node:crypto";
import { getTurso } from "@/lib/turso";

export interface VaultUser {
  id: string;
  name: string;
  status: "pending" | "active";
}

export async function findUser(id: unknown): Promise<VaultUser | null> {
  if (typeof id !== "string" || !id) return null;
  const database = await getTurso();
  const result = await database.execute({ sql: "SELECT id, name, status FROM vault_users WHERE id = ?", args: [id] });
  const row = result.rows[0];
  return row ? { id: String(row.id), name: String(row.name), status: String(row.status) as VaultUser["status"] } : null;
}

export interface WrapperRow {
  id: string;
  kdfSalt: string;
  kdfIters: number | null;
  iv: string;
  wrappedDek: string;
}

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

export function toWrapperRow(row: Record<string, unknown>): WrapperRow {
  return {
    id: String(row.id),
    kdfSalt: String(row.kdf_salt),
    kdfIters: row.kdf_iters === null || row.kdf_iters === undefined ? null : Number(row.kdf_iters),
    iv: String(row.iv),
    wrappedDek: String(row.wrapped_dek),
  };
}
