import { useEffect, useState } from "react";
import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { getCredentialGroupAppearance } from "@/config/credential-groups";
import type { CredentialGroupDefinition } from "@/types/credential";

interface ManageCredentialGroupsProps {
  groups: CredentialGroupDefinition[];
  onRename: (currentName: string, newName: string, color: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  onClose: () => void;
}

export function ManageCredentialGroups({ groups, onRename, onDelete, onClose }: ManageCredentialGroupsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#9CA3AF");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const startEditing = (group: CredentialGroupDefinition) => {
    setEditing(group.name);
    setNewName(group.name);
    setNewColor(group.color);
    setConfirmingDelete(null);
    setError("");
  };

  const saveRename = async () => {
    if (!editing || !newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onRename(editing, newName.trim(), newColor);
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo renombrar el grupo.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (group: string) => {
    setSaving(true);
    setError("");
    try {
      await onDelete(group);
      setConfirmingDelete(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo eliminar el grupo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#171917]/55 p-4 backdrop-blur-[3px]">
      <section role="dialog" aria-modal="true" aria-labelledby="manage-groups-title" className="w-full max-w-lg rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_28px_90px_rgba(23,25,23,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="manage-groups-title" className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">Gestionar grupos</h2>
            <p className="mt-1 text-sm font-medium text-[var(--muted)]">Renombra o elimina categorías de tus cuentas.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {groups.map((group) => {
            const appearance = getCredentialGroupAppearance(group.name, group.color);
            const isEditing = editing === group.name;
            const isDeleting = confirmingDelete === group.name;

            return (
              <div key={group.name} className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2.5">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      className="min-h-10 min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--ink)] outline-none focus:border-[var(--line-strong)]"
                      autoFocus
                    />
                    <label className="relative grid size-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface)]" title="Cambiar color">
                      <span className="size-5 rounded-full" style={{ backgroundColor: newColor }} />
                      <input type="color" value={newColor} onChange={(event) => setNewColor(event.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Color del grupo" />
                    </label>
                    <button type="button" onClick={saveRename} disabled={saving || !newName.trim()} aria-label="Guardar nombre" className="grid size-9 place-items-center rounded-full bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50">
                      {saving ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} disabled={saving} aria-label="Cancelar edición" className="grid size-9 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)]">
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : isDeleting ? (
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ink)]">¿Eliminar {group.name}?</p>
                    <p className="mt-0.5 text-xs font-semibold leading-5 text-[var(--muted)]">Las cuentas se conservarán y pasarán a “Sin grupo”.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setConfirmingDelete(null)} disabled={saving} className="min-h-9 rounded-full px-3 text-xs font-extrabold text-[var(--muted-strong)] hover:bg-[var(--surface)]">Cancelar</button>
                      <button type="button" onClick={() => remove(group.name)} disabled={saving} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--danger)] px-3 text-xs font-extrabold text-white disabled:opacity-60">
                        {saving && <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />}
                        Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: appearance?.accent ?? "#9ca3af" }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-[var(--ink)]">{group.name}</span>
                    <button type="button" onClick={() => startEditing(group)} aria-label={`Editar ${group.name}`} title="Editar nombre y color" className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]">
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" onClick={() => { setConfirmingDelete(group.name); setEditing(null); setError(""); }} aria-label={`Eliminar ${group.name}`} title="Eliminar" className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)]">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger-text)]">{error}</p>}
      </section>
    </div>
  );
}
