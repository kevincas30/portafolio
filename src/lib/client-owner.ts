// Responsables de un cliente: una lista de ids del equipo (src/config/site.ts).
// Vacia = sin asignar; una persona = suyo; dos o mas = compartido.
import { site, type TeamMember } from "@/config/site";

export const MAX_OWNERS = 10;

const teamById = new Map(site.team.map((member) => [member.id, member]));

export function teamMembers(): TeamMember[] {
  return site.team;
}

/** Normaliza lo recibido: solo ids del equipo, sin repetidos y en el orden del equipo. null si es invalido. */
export function parseOwners(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_OWNERS) return null;
  if (!value.every((item) => typeof item === "string" && teamById.has(item))) return null;
  const chosen = new Set(value as string[]);
  return site.team.filter((member) => chosen.has(member.id)).map((member) => member.id);
}

/** Columna owners de la base (ids separados por coma) a lista; descarta ids que ya no esten en el equipo. */
export function ownersFromColumn(value: unknown): string[] {
  if (typeof value !== "string" || !value) return [];
  return parseOwners(value.split(",")) ?? value.split(",").filter((id) => teamById.has(id));
}

export function ownersToColumn(owners: string[]): string {
  return owners.join(",");
}

export function ownerMembers(owners: string[]): TeamMember[] {
  return owners.map((id) => teamById.get(id)).filter((member): member is TeamMember => Boolean(member));
}

export function ownerLabel(owners: string[]): string {
  const members = ownerMembers(owners);
  if (members.length === 0) return "Sin asignar";
  if (members.length === 1) return members[0].name;
  return "Compartido";
}

/** Texto completo para title/aria-label: "Compartido: Kevs y Gabriel". */
export function ownerDescription(owners: string[]): string {
  const members = ownerMembers(owners);
  if (members.length < 2) return ownerLabel(owners);
  const names = members.map((member) => member.name);
  return `Compartido: ${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}
