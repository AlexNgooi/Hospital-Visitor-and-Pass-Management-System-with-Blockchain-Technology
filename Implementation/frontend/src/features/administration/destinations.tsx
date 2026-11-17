import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, RefreshCw, X } from "lucide-react";
import { Button } from "../../components/ui/primitives";
import { ToastNotice } from "../../components/ui/toast";
import { preserveToastInteraction } from "../../components/ui/dialog-feedback";
import { apiClient } from "../../lib/api-client";
import { referencesSchema, savedSchema, type Reference } from "./contracts";
import { useRemote, useSave } from "./hooks";
import { LoadNotice } from "./data";
import { AdminFilterDialog } from "./filter-dialog";
import { ReferenceForm } from "./settings";

/** The catalogue controls future registrations; disabling or renaming never rewrites captured visit destinations. */
export function DestinationsPage() {
  const remote = useRemote("/api/admin/destinations", referencesSchema);
  const save = useSave(remote.reload);
  const [editing, setEditing] = useState<Reference | "new" | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null), heading = useRef<HTMLHeadingElement>(null), restoreFocus = useRef(false);
  useEffect(() => {
    // A successful save reloads and temporarily disables its opener; restore focus once that read completes.
    if (!editing && !remote.busy && !save.busy && restoreFocus.current) {
      if ((document.activeElement === heading.current || document.activeElement === document.body) && opener.current?.isConnected && !opener.current.disabled) opener.current.focus();
      restoreFocus.current = false;
    }
  }, [editing, remote.busy, save.busy]);
  const [filters, setFilters] = useState({ search: "", kind: "ALL", state: "ALL" }), [page, setPage] = useState(0);
  const rows = remote.data?.filter(row => (filters.kind === "ALL" || row.kind === filters.kind)
    && (filters.state === "ALL" || row.active === (filters.state === "ACTIVE"))
    && `${row.code} ${row.name}`.toLowerCase().includes(filters.search.toLowerCase())) ?? [];
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 25) - 1));
  return <div className="admin-page admin-task-page">
    <header className="admin-heading"><div><h1 ref={heading} tabIndex={-1}>Destination management</h1><p>Wards and other registered destinations.</p></div><div className="admin-actions">
      <AdminFilterDialog title="Filter destinations" description="Choose destination type, status or search by code and name.">
        {close => <DestinationFilters initial={filters} apply={value => { setFilters(value); setPage(0); close(); }} cancel={close} />}
      </AdminFilterDialog>
      <Button variant="secondary" disabled={remote.busy || save.busy} onClick={remote.reload}><RefreshCw size={17} aria-hidden="true" />Refresh</Button>
      <Button disabled={remote.busy || Boolean(remote.error) || save.busy} onClick={event => { opener.current = event.currentTarget; setEditing("new"); }}><Plus size={17} aria-hidden="true" />Add destination</Button>
    </div></header>
    <p className="admin-applied-summary">Executive / Penjaga use wards. Vendor / Contractor can select wards or other destinations. Physical passes are not bound to a destination.</p>
    <LoadNotice busy={remote.busy} error={remote.error} reload={remote.reload} />
    {save.message && <ToastNotice tone={save.tone}>{save.message}</ToastNotice>}
    <section className="admin-card admin-directory-card admin-task-fill">
      <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Destinations"><table><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {rows.slice(currentPage * 25, currentPage * 25 + 25).map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{row.kind === "WARD" ? "Ward" : "Other destination"}</td><td>{row.active ? "Active" : "Inactive"}</td><td><Button variant="secondary" disabled={save.busy || remote.busy || Boolean(remote.error)} onClick={event => { opener.current = event.currentTarget; setEditing(row); }}>Edit</Button></td></tr>)}
      </tbody></table>{remote.data && !rows.length && <p>No destinations match these filters.</p>}</div>
      <footer className="admin-table-footer"><span>{rows.length} matching destinations · Page {currentPage + 1}</span><div className="admin-actions"><Button variant="secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button variant="secondary" disabled={(currentPage + 1) * 25 >= rows.length} onClick={() => setPage(currentPage + 1)}>Next</Button></div></footer>
    </section>
    <Dialog.Root open={editing !== null} onOpenChange={open => { if (!open && !save.busy) setEditing(null); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content admin-dialog" onInteractOutside={preserveToastInteraction} onCloseAutoFocus={event => {
      event.preventDefault();
      if (opener.current?.isConnected && !opener.current.disabled) opener.current.focus();
      else { heading.current?.focus(); restoreFocus.current = true; }
    }} onEscapeKeyDown={event => { if (save.busy) event.preventDefault(); }} onPointerDownOutside={event => { if (save.busy) event.preventDefault(); }}>
      <div className="admin-dialog-heading"><Dialog.Title>{editing === "new" ? "Add destination" : "Edit destination"}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" disabled={save.busy} aria-label="Close destination form"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
      <Dialog.Description>Codes stay fixed. Inactive destinations remain in history and are excluded from new registrations.</Dialog.Description>
      {editing && <ReferenceForm key={editing === "new" ? "new" : `${editing.id}:${editing.version}`} kind="destinations" reference={editing === "new" ? null : editing} busy={save.busy} onCancel={() => setEditing(null)} onSave={body => {
        const path = `/api/admin/destinations${editing === "new" ? "" : `/${editing.id}`}`;
        void save.run(() => apiClient.command(path, body, savedSchema, { method: editing === "new" ? "POST" : "PATCH", authRequired: true }).execute(), () => setEditing(null));
      }} />}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}

/** Modal drafts only affect the list after Apply; Cancel/Escape/outside interaction discards them. */
function DestinationFilters({ initial, apply, cancel }: { initial: { search: string; kind: string; state: string }; apply: (value: typeof initial) => void; cancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  return <form className="admin-filter-form" onSubmit={event => { event.preventDefault(); apply(draft); }}>
    <label className="admin-field">Search code or name<input type="search" maxLength={120} value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} /></label>
    <label className="admin-field">Type<select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value })}><option value="ALL">All types</option><option value="WARD">Ward</option><option value="OTHER">Other destination</option></select></label>
    <label className="admin-field">Status<select value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
    <div className="dialog-actions"><Button variant="secondary" onClick={cancel}>Cancel</Button><Button type="submit">Apply filters</Button></div>
  </form>;
}
