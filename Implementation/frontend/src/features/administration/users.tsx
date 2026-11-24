import { useEffect, useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LockKeyhole, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { ToastNotice } from "../../components/ui/toast";
import { preserveToastInteraction } from "../../components/ui/dialog-feedback";
import { useAuth } from "../../app/auth-context";
import { Button, InputField } from "../../components/ui/primitives";
import { apiClient } from "../../lib/api-client";
import { savedSchema, usersSchema, staffEmailSchema, deliverySchema, type User } from "./contracts";
import { LoadNotice } from "./data";
import { useRemote, useSave } from "./hooks";
import { AdminFilterDialog } from "./filter-dialog";

/** The directory is horizontal; creation remains an explicit, focus-managed modal action. */
export function AccountPage() {
  const { state } = useAuth();
  if (state.kind !== "authenticated" || state.user.role !== "ADMIN") return null;
  return <AccountWorkspace key={state.user.id} currentUserId={state.user.id} />;
}
function AccountWorkspace({ currentUserId }: { currentUserId: string }) {
  const users = useRemote("/api/admin/users", usersSchema);
  const email = useRemote("/api/admin/staff-email", staffEmailSchema);
  const save = useSave(users.reload);
  const [editing, setEditing] = useState<User | "new" | null>(null), [grantUser, setGrantUser] = useState<User | null>(null);
  const [search, setSearch] = useState(""), [role, setRole] = useState(""), [status, setStatus] = useState("");
  const [delivery, setDelivery] = useState("");
  const createButton = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null), restoreFocus = useRef(false);
  useEffect(() => {
    if (!editing && !grantUser && !save.busy && !users.busy && restoreFocus.current) {
      const target = opener.current?.isConnected && !opener.current.disabled ? opener.current : heading.current;
      target?.focus(); restoreFocus.current = false;
    }
  }, [editing, grantUser, save.busy, users.busy]);
  const activeAdmins = users.data?.filter(user => user.role === "ADMIN" && user.active && !user.passwordChangeRequired).length;
  const rows = users.data?.filter(user => `${user.fullName} ${user.login}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!role || user.role === role) && (!status || String(user.active) === status));
  const accessEnabled = grantUser?.staffAccessEnabled === true;
  const blocked = save.busy || users.busy || Boolean(users.error);
  /** Radix closes after its focus scope unmounts; restore immediately unless another dialog is opening. */
  function restoreAccountFocus(event: Event) {
    event.preventDefault();
    requestAnimationFrame(() => {
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      const target = opener.current?.isConnected && !opener.current.disabled ? opener.current : heading.current;
      target?.focus(); restoreFocus.current = save.busy || users.busy;
    });
  }
  function sent(result: { emailStatus: string }) {
    setDelivery(result.emailStatus === "ACCEPTED" ? "Account saved. The mail server accepted the email; inbox delivery is not confirmed." : "Account saved, but email delivery is unknown. Inspect the account before deliberately sending a replacement password.");
  }
  return <div className="admin-page admin-directory admin-task-page">
    <header className="admin-heading"><div><h1 ref={heading} tabIndex={-1}>Staff management</h1><p>Manage staff accounts and access.</p></div><div className="admin-actions">
      <AdminFilterDialog title="Filter staff" description="Search staff names or logins and choose an account type and status." disabled={save.busy}>
        {close => <StaffFilters search={search} role={role} status={status} onCancel={close} onApply={value => { setSearch(value.search); setRole(value.role); setStatus(value.status); close(); }} />}
      </AdminFilterDialog><Button variant="secondary" disabled={save.busy || users.busy} onClick={() => { users.reload(); email.reload(); }}><RefreshCw size={17} aria-hidden="true" />Refresh</Button><Button ref={createButton} disabled={blocked} onClick={event => { opener.current = event.currentTarget; setDelivery(""); setEditing("new"); }}><Plus size={18} aria-hidden="true" />Create account</Button></div></header>
    <LoadNotice busy={users.busy || email.busy} error={users.error || email.error} reload={() => { users.reload(); email.reload(); }} />
    {save.message && <ToastNotice tone={save.tone}>{save.message}</ToastNotice>}
    {delivery && <div className="admin-notice" role="status">{delivery}</div>}
    <p className="admin-applied-summary">{search ? `Search: ${search}` : "All names"} · {role === "ADMIN" ? "Administrator" : role === "COUNTER_STAFF" ? "Counter staff" : "All account types"} · {status === "true" ? "Active" : status === "false" ? "Inactive" : "All statuses"}</p>
    <section className="admin-card admin-directory-card admin-task-fill">
      {users.data && <><div className="admin-table-scroll" role="region" aria-label="Staff accounts" tabIndex={0}><table><thead><tr><th>Name</th><th>Account type</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {rows?.map(user => <tr key={user.id}><td><div className="admin-person"><span className="admin-initials" aria-hidden="true">{user.fullName.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase()}</span><span><strong>{user.fullName}</strong>{user.id === currentUserId && <small> · You</small>}<small>{user.login}{user.passwordChangeRequired ? " · Password setup required" : ""}</small></span></div></td><td>{user.role === "ADMIN" ? "Administrator" : "Counter staff"}</td><td><span className={`admin-status ${user.active ? "status-active" : "status-inactive"}`}>{user.active ? "Active" : "Inactive"}</span></td><td><Button variant="secondary" disabled={blocked} onClick={event => { opener.current = event.currentTarget; setEditing(user); }}>Edit</Button></td></tr>)}
      </tbody></table></div>{!rows?.length && <p className="admin-empty">No accounts match these filters.</p>}<div className="admin-table-footer"><span>{rows?.length} of {users.data.length} staff accounts</span><span><ShieldCheck size={17} aria-hidden="true" />The last administrator with a completed password setup is protected.</span></div></>}
    </section>
    <Dialog.Root open={editing !== null} onOpenChange={open => { if (!open && !save.busy) setEditing(null); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="dialog-content admin-dialog admin-account-dialog" onInteractOutside={preserveToastInteraction} onEscapeKeyDown={event => { if (save.busy) event.preventDefault(); }} onPointerDownOutside={event => { if (save.busy) event.preventDefault(); }} onCloseAutoFocus={restoreAccountFocus}>
        <div className="admin-dialog-heading"><Dialog.Title>{editing === "new" ? "Create staff account" : "Edit staff account"}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" disabled={save.busy} aria-label="Close account form"><X size={21} aria-hidden="true" /></Button></Dialog.Close></div>
        <Dialog.Description>{editing === "new" ? "Add a staff member and send their sign-in details." : "Update staff details, account type and access."}</Dialog.Description>
        {editing && <AccountForm key={editing === "new" ? "new" : `${editing.id}:${editing.version}`} user={editing === "new" ? null : editing} busy={save.busy} emailReady={email.data?.configured === true && !email.error} lastAdmin={editing !== "new" && editing.active && !editing.passwordChangeRequired && editing.role === "ADMIN" && activeAdmins === 1} onCancel={() => setEditing(null)} onSubmit={body => {
          void save.run(async () => {
            if (editing === "new") sent(await apiClient.post("/api/admin/users", body, deliverySchema, { authRequired: true }));
            else await apiClient.command(`/api/admin/users/${editing.id}`, body, savedSchema, { method: "PATCH", authRequired: true }).execute();
          }, () => setEditing(null));
        }} />}
        {editing && editing !== "new" && <div className="admin-account-access">
          {editing.role === "COUNTER_STAFF" && <><h3>Staff access</h3>
            <p>{editing.staffAccessEnabled ? "Enabled" : "Disabled"}</p>
            <Button variant="secondary" disabled={blocked} onClick={() => { setGrantUser(editing); setEditing(null); }}>
              {editing.staffAccessEnabled ? "Disable staff access" : "Enable staff access"}
            </Button>
          </>}
          {editing.passwordChangeRequired && <><h3>Initial password email</h3><p>{editing.email ?? "No email set"} · {editing.onboardingDelivery === "ACCEPTED" ? "Accepted by mail server" : editing.onboardingDelivery === "PENDING" ? "Sending or interrupted; inspect before sending again" : "Delivery unknown"}</p><Button variant="secondary" disabled={blocked || !editing.active || !email.data?.configured || Boolean(email.error) || !editing.email} onClick={() => {
            if (!window.confirm("Generate and email a replacement temporary password? The previous temporary password and sessions will stop working.")) return;
            void save.run(async () => sent(await apiClient.post(`/api/admin/users/${editing.id}/initial-email`, { version: editing.version }, deliverySchema, { authRequired: true })), () => setEditing(null));
          }}>Send replacement initial password</Button></>}
        </div>}
        {save.message && <p className="admin-inline-error" role="status">{save.message}</p>}
      </Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={grantUser !== null} onOpenChange={open => { if (!open && !save.busy) setGrantUser(null); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content admin-dialog" onCloseAutoFocus={restoreAccountFocus} onInteractOutside={preserveToastInteraction} onEscapeKeyDown={event => { if (save.busy) event.preventDefault(); }} onPointerDownOutside={event => { if (save.busy) event.preventDefault(); }}>
      <Dialog.Title>{accessEnabled ? "Disable" : "Enable"} staff access</Dialog.Title>
      <Dialog.Description>Confirm this access change for {grantUser?.fullName}. Existing sessions will end.</Dialog.Description>
      <form onSubmit={event => {
        event.preventDefault();
        if (!grantUser) return;
        const body = { version: grantUser.version, active: !accessEnabled };
        void save.run(() => apiClient.command(`/api/admin/users/${grantUser.id}/staff-access`, body, savedSchema, { method: "PATCH", authRequired: true }).execute(), () => setGrantUser(null));
      }}>
        {save.message && <p role="status">{save.message}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" disabled={save.busy} onClick={() => setGrantUser(null)}>Cancel</Button>
          <Button type="submit" busy={save.busy} disabled={!grantUser}>{accessEnabled ? "Disable access" : "Enable access"}</Button>
        </div>
      </form></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}

/** No password/reason input is collected. Changed security policy still requires deliberate confirmation. */
function AccountForm({ user, busy, emailReady, lastAdmin, onCancel, onSubmit }: { user: User | null; busy: boolean; emailReady: boolean; lastAdmin: boolean; onCancel: () => void; onSubmit: (body: unknown) => void }) {
  const [name, setName] = useState(user?.fullName ?? ""), [login, setLogin] = useState(user?.login ?? ""), [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "COUNTER_STAFF"), [active, setActive] = useState(user?.active ?? true), [confirmed, setConfirmed] = useState(false);
  const policyChanged = Boolean(user && (user.role !== role || user.active !== active));
  const changed = !user || policyChanged || user.fullName !== name || (user.email ?? "") !== email;
  return <form onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(user ? { version: user.version, role, active, fullName: name, email } : { login, fullName: name, email, role }); }} aria-busy={busy}>
    <InputField id="staff-full-name" label="Full name" required maxLength={120} autoComplete="name" value={name} disabled={busy} onChange={event => setName(event.target.value)} />
    <InputField id="staff-login" label="Staff login" required pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" maxLength={64} autoComplete="off" value={login} disabled={busy || Boolean(user)} onChange={event => setLogin(event.target.value)} />
    <InputField id="staff-email" label="Email address" type="email" maxLength={254} placeholder="name@example.com" autoComplete="email" required={!user} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} />
    <label className="admin-field">Account type<select disabled={busy || lastAdmin} value={role} onChange={event => { setRole(event.target.value as User["role"]); setConfirmed(false); }}><option value="COUNTER_STAFF">Counter staff</option><option value="ADMIN">Administrator</option></select></label>
    {user ? <><label className="admin-check"><input type="checkbox" checked={active} disabled={busy || lastAdmin} onChange={event => { setActive(event.target.checked); setConfirmed(false); }} />Active account</label><p className="muted">Saving account changes revokes existing sessions.</p>{lastAdmin && <p className="muted">The last ready administrator cannot be disabled or demoted.</p>}</> : <><div className="admin-password-note"><LockKeyhole size={22} aria-hidden="true" /><div><strong>System-generated temporary password</strong><p>Emailed to the staff member. Password change required on first sign-in.</p></div></div><p className="muted">Temporary password expires in 24 hours. Email status is shown after creation.</p>{!emailReady && <p className="admin-inline-error" role="status">Staff email is not configured or its status is unavailable. Creation is unavailable until it is configured.</p>}</>}
    {policyChanged && <label className="admin-check"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I confirm this account type/status change and session revocation.</label>}
    <div className="dialog-actions"><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" busy={busy} disabled={!changed || !user && !emailReady || policyChanged && !confirmed}>{user ? "Save changes" : "Create & send email"}</Button></div>
  </form>;
}

/** Search remains memory-only and covers the complete authorized staff directory, not a visible row subset. */
function StaffFilters({ search, role, status, onApply, onCancel }: { search: string; role: string; status: string; onApply: (value: { search: string; role: string; status: string }) => void; onCancel: () => void }) {
  const [draftSearch, setSearch] = useState(search), [draftRole, setRole] = useState(role), [draftStatus, setStatus] = useState(status);
  return <form className="admin-filter-form" onSubmit={event => { event.preventDefault(); onApply({ search: draftSearch.trim(), role: draftRole, status: draftStatus }); }}>
    <InputField id="staff-filter-search" label="Search name or login" type="search" maxLength={120} autoComplete="off" value={draftSearch} onChange={event => setSearch(event.target.value)} />
    <label className="admin-field">Account type<select value={draftRole} onChange={event => setRole(event.target.value)}><option value="">All account types</option><option value="ADMIN">Administrator</option><option value="COUNTER_STAFF">Counter staff</option></select></label>
    <label className="admin-field">Status<select value={draftStatus} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
    <div className="dialog-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit">Apply filters</Button></div>
  </form>;
}
