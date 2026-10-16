import { UserRound } from "lucide-react";
import type { TeamMember } from "@/config/site";
import { ownerDescription, ownerLabel, ownerMembers } from "@/lib/client-owner";

const sizes = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
};

type AvatarSize = keyof typeof sizes;

/** Circulo con la foto del miembro (o su inicial si no tiene). */
export function MemberAvatar({ member, size = "sm" }: { member: TeamMember; size?: AvatarSize }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)] font-extrabold text-[var(--accent-text)] ring-2 ring-[var(--surface)] ${sizes[size]}`}>
      {member.photo ? (
        <img src={member.photo} alt="" loading="lazy" className="size-full object-cover" style={{ objectPosition: member.photoPosition ?? "center" }} />
      ) : (
        member.initial
      )}
    </span>
  );
}

/** Avatares superpuestos de los responsables, como los co-autores de un commit. */
export function OwnerAvatars({ owners, size = "sm", showLabel = false }: { owners: string[]; size?: AvatarSize; showLabel?: boolean }) {
  const members = ownerMembers(owners);
  const description = ownerDescription(owners);

  return (
    <span title={description} aria-label={`Responsable: ${description}`} role="img" className="inline-flex shrink-0 items-center gap-2">
      {members.length === 0 ? (
        <span className={`grid place-items-center rounded-full border border-dashed border-[var(--line-strong)] text-[var(--muted)] ${sizes[size]}`}>
          <UserRound aria-hidden="true" className="size-3.5" />
        </span>
      ) : (
        <span className="flex -space-x-2">
          {members.map((member) => <MemberAvatar key={member.id} member={member} size={size} />)}
        </span>
      )}
      {showLabel && <span className="text-xs font-bold text-[var(--muted-strong)]">{ownerLabel(owners)}</span>}
    </span>
  );
}
