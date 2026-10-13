export const ADMIN_BASE = "/admin";

export function withBase(path: string): string {
  return `${ADMIN_BASE}${path}`;
}
