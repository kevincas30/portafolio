import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { CredentialForm } from "@/components/passwords/CredentialForm";
import { CredentialDetail } from "@/components/passwords/CredentialDetail";
import { CredentialGroupFilter } from "@/components/passwords/CredentialGroupFilter";
import { CredentialList } from "@/components/passwords/CredentialList";
import { DeleteCredentialDialog } from "@/components/passwords/DeleteCredentialDialog";
import { ImportPasswords } from "@/components/passwords/ImportPasswords";
import { ManageCredentialGroups } from "@/components/passwords/ManageCredentialGroups";
import { PasswordSearch } from "@/components/passwords/PasswordSearch";
import { PasswordsHeader } from "@/components/passwords/PasswordsHeader";
import { Toast } from "@/components/passwords/Toast";
import { GMAIL_INBOX_URL } from "@/config/credential-platforms";
import type { Credential, CredentialDraft, CredentialsController, GroupsController, ImportedCredential } from "@/types/credential";

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

interface PasswordsViewProps {
  credentialsState: CredentialsController;
  groupsState: GroupsController;
  onLock: () => void;
  /** Nombre del dueno de la boveda, si aplica. */
  owner?: string;
  /** Botones extra del encabezado (cambiar de usuario, anadir passkey...). */
  headerActions?: ReactNode;
  footerText: string;
}

// Vista de contrasenas independiente de la fuente de datos: la alimenta la boveda por usuario.
export function PasswordsView({ credentialsState, groupsState, onLock, owner, headerActions, footerText }: PasswordsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [deletingCredential, setDeletingCredential] = useState<Credential | null>(null);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToast(""), 2_000);
  }, []);

  const credentialMap = useMemo(
    () => new Map(credentialsState.credentials.map((credential) => [credential.id, credential])),
    [credentialsState.credentials],
  );
  const selectedCredential = selectedCredentialId ? credentialMap.get(selectedCredentialId) ?? null : null;

  const googleCredentials = useMemo(
    () => credentialsState.credentials.filter((credential) =>
      credential.loginMethod === "password" && credential.provider === "google"),
    [credentialsState.credentials],
  );

  const groups = groupsState.groups;
  const groupNames = groups.map((group) => group.name);

  const activeGroup = selectedGroup && groupNames.includes(selectedGroup) ? selectedGroup : null;

  const visibleCredentials = useMemo(() => {
    const query = normalizeSearch(search);
    const matches = query
      ? credentialsState.credentials.filter((credential) => {
          const loginCredential = credential.loginCredentialId ? credentialMap.get(credential.loginCredentialId) : null;
          const emailCredential = credential.emailCredentialId ? credentialMap.get(credential.emailCredentialId) : null;
          const haystack = [
            credential.name,
            credential.platform,
            credential.category,
            credential.groupName,
            credential.url,
            credential.provider,
            credential.email,
            credential.username,
            credential.notes,
            credential.accessInstructions,
            loginCredential?.name,
            loginCredential?.platform,
            loginCredential?.email,
            loginCredential?.username,
            loginCredential?.url,
            loginCredential?.provider,
            loginCredential?.category,
            loginCredential?.groupName,
            loginCredential?.notes,
            emailCredential?.name,
            emailCredential?.platform,
            emailCredential?.email,
            emailCredential?.username,
            emailCredential?.url,
            emailCredential?.provider,
            emailCredential?.category,
            emailCredential?.groupName,
            emailCredential?.notes,
          ].filter(Boolean).join(" ");
          return normalizeSearch(haystack).includes(query);
        })
      : credentialsState.credentials.filter((credential) =>
          !activeGroup || normalizeSearch(credential.groupName) === normalizeSearch(activeGroup));

    return [...matches].sort((first, second) => {
      if (first.favorite !== second.favorite) return first.favorite ? -1 : 1;
      return first.name.localeCompare(second.name, "es", { sensitivity: "base" });
    });
  }, [activeGroup, credentialMap, credentialsState.credentials, search]);

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    if (value.trim()) setSelectedGroup(null);
  }, []);

  const changeGroup = useCallback((group: string | null) => {
    setSelectedGroup(group);
    setSearch("");
  }, []);

  const openCredential = useCallback((credentialId: string) => {
    setSelectedCredentialId(credentialId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const dependencies = useMemo(() => {
    if (!deletingCredential) return [];
    return credentialsState.credentials.filter((credential) =>
      credential.loginCredentialId === deletingCredential.id ||
      credential.emailCredentialId === deletingCredential.id);
  }, [credentialsState.credentials, deletingCredential]);

  const openCreate = () => {
    setEditingCredential(null);
    setFormOpen(true);
  };

  const openEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setFormOpen(true);
  };

  const saveCredential = async (draft: CredentialDraft) => {
    if (editingCredential) {
      await credentialsState.update(editingCredential, draft);
      showToast("Cuenta actualizada");
    } else {
      await credentialsState.create(draft);
      showToast("Cuenta creada");
    }
    setFormOpen(false);
    setEditingCredential(null);
    await groupsState.refresh();
  };

  const createGoogle = async (email: string, password: string, groupName: string) => {
    if (groupName.trim() && !groups.some((group) => normalizeSearch(group.name) === normalizeSearch(groupName))) {
      await groupsState.create(groupName.trim(), "#9CA3AF");
    }
    const created = await credentialsState.create({
      name: "Google / Gmail",
      platform: "Google / Gmail",
      category: "Correo",
      groupName,
      url: GMAIL_INBOX_URL,
      provider: "google",
      loginMethod: "password",
      email,
      username: "",
      password,
      loginCredentialId: null,
      emailCredentialId: null,
      accessInstructions: "",
      notes: "",
      favorite: false,
    });
    showToast("Cuenta Google añadida");
    return created;
  };

  const importCredentials = async (items: ImportedCredential[]) => {
    for (const item of items) {
      await credentialsState.create({
        name: item.name,
        platform: "",
        category: "",
        groupName: "",
        url: item.url,
        provider: null,
        loginMethod: "password",
        email: "",
        username: item.username,
        password: item.password,
        loginCredentialId: null,
        emailCredentialId: null,
        accessInstructions: "",
        notes: item.notes,
        favorite: false,
      });
    }
    setImportOpen(false);
    showToast(`${items.length} ${items.length === 1 ? "cuenta importada" : "cuentas importadas"}`);
  };

  const confirmDelete = async (force: boolean) => {
    if (!deletingCredential) return;
    const deletingId = deletingCredential.id;
    await credentialsState.remove(deletingCredential.id, force);
    setDeletingCredential(null);
    if (selectedCredentialId === deletingId) setSelectedCredentialId(null);
    showToast("Cuenta eliminada");
  };

  if (selectedCredential) {
    return (
      <>
        <CredentialDetail
          credential={selectedCredential}
          credentialMap={credentialMap}
          groupColor={groups.find((group) => normalizeSearch(group.name) === normalizeSearch(selectedCredential.groupName))?.color}
          onBack={() => setSelectedCredentialId(null)}
          onOpenCredential={openCredential}
          onEdit={openEdit}
          onDelete={setDeletingCredential}
          onToggleFavorite={(credential) => {
            void credentialsState.toggleFavorite(credential).catch(() => showToast("No se pudo cambiar el favorito"));
          }}
          onToast={showToast}
        />

        {formOpen && (
          <CredentialForm
            key={editingCredential?.id ?? "new-credential"}
            credential={editingCredential ?? undefined}
            googleCredentials={googleCredentials}
            groupNames={groupNames}
            onSave={saveCredential}
            onCreateGoogle={createGoogle}
            onCreateGroup={groupsState.create}
            onCancel={() => {
              setFormOpen(false);
              setEditingCredential(null);
            }}
          />
        )}

        {deletingCredential && (
          <DeleteCredentialDialog
            credential={deletingCredential}
            dependencies={dependencies}
            onCancel={() => setDeletingCredential(null)}
            onConfirm={confirmDelete}
          />
        )}

        <Toast message={toast} />
      </>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PasswordsHeader
        onCreate={openCreate}
        onImport={() => setImportOpen(true)}
        onLock={onLock}
        owner={owner}
        extraActions={headerActions}
      />
      <PasswordSearch value={search} onChange={changeSearch} resultCount={visibleCredentials.length} />
      <CredentialGroupFilter groups={groups} value={activeGroup} onChange={changeGroup} onManage={() => setManageGroupsOpen(true)} />

      {(credentialsState.error || groupsState.error) && (
        <div className="rounded-2xl border border-[var(--danger-border-soft)] bg-[var(--danger-soft-strong)] px-4 py-3 text-sm font-bold text-[var(--danger-text)]">{credentialsState.error || groupsState.error}</div>
      )}

      <CredentialList
        credentials={visibleCredentials}
        searching={Boolean(search.trim())}
        loading={credentialsState.loading}
        onCreate={openCreate}
        onOpen={openCredential}
      />

      <footer className="flex items-center justify-center gap-2 pb-4 pt-2 text-center text-xs font-semibold text-[var(--ink)] sm:text-sm">
        <LockKeyhole aria-hidden="true" className="size-4 text-[var(--ink)]" />
        {footerText}
      </footer>

      {formOpen && (
        <CredentialForm
          key={editingCredential?.id ?? "new-credential"}
          credential={editingCredential ?? undefined}
          googleCredentials={googleCredentials}
          groupNames={groupNames}
          onSave={saveCredential}
          onCreateGoogle={createGoogle}
          onCreateGroup={groupsState.create}
          onCancel={() => {
            setFormOpen(false);
            setEditingCredential(null);
          }}
        />
      )}

      {deletingCredential && (
        <DeleteCredentialDialog
          credential={deletingCredential}
          dependencies={dependencies}
          onCancel={() => setDeletingCredential(null)}
          onConfirm={confirmDelete}
        />
      )}

      {importOpen && (
        <ImportPasswords
          onCancel={() => setImportOpen(false)}
          onImport={importCredentials}
        />
      )}

      {manageGroupsOpen && (
        <ManageCredentialGroups
          groups={groups}
          onRename={async (currentName, newName, color) => {
            await groupsState.rename(currentName, newName, color);
            setSelectedGroup(null);
            await credentialsState.refresh();
            showToast("Grupo actualizado");
          }}
          onDelete={async (name) => {
            await groupsState.remove(name);
            setSelectedGroup(null);
            await credentialsState.refresh();
            showToast("Grupo eliminado");
          }}
          onClose={() => setManageGroupsOpen(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
