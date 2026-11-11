import { ToastNotice } from "../../components/ui/toast";
import { preserveToastInteraction } from "../../components/ui/dialog-feedback";
import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "../../app/auth-context";
import { Button, InputField } from "../../components/ui/primitives";
import { apiClient } from "../../lib/api-client";
import { referencesSchema, savedSchema, usersSchema, type Reason, type User } from "./contracts";
import { LoadNotice, ReasonSelect } from "./data";
import { useRemote, useSave } from "./hooks";

/** Real account and counter-grant administration uses the server's version/revocation policy; roles are never inferred from navigation. */
export function AccountPage() {
  const { state } = useAuth();
  if (state.kind !== "authenticated" || state.user.role !== "ADMIN") return <ToastNotice>Administrator access required.</ToastNotice>;
  return <AccountWorkspace key={state.user.id} currentUserId={state.user.id} />;
}

/** Start with the signed-in administrator and keep each selected account's details and grants together. */
function AccountWorkspace({ currentUserId }: { currentUserId: string }) {
  const [selectedId, setSelectedId] = useState(currentUserId);
  const users = useRemote("/api/admin/users", usersSchema);
  const counters = useRemote("/api/admin/counters", referencesSchema);
  const save = useSave(users.reload);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [grantUser, setGrantUser] = useState<User | null>(null);
  const [counterId, setCounterId] = useState("");
  const [grant, setGrant] = useState(true), [reason, setReason] = useState<Reason>("ACCESS_REVIEW");
  const activeAdmins = users.data?.filter((user) => user.role === "ADMIN" && user.active).length;
  const grantCounter = counters.data?.find((counter) => counter.id === counterId);
  const permission = grantUser?.permissions.find((entry) => entry.counterId === counterId);
  const selected = users.data?.find(user => user.id === selectedId);
  const options = users.data ? [...users.data].sort((a, b) => a.id === b.id ? 0 : a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : a.login.localeCompare(b.login)) : [];
  return <div className="admin-page">
    <header className="admin-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>Staff accounts</h1><p>Manage roles and explicit counter access. Access changes revoke old sessions.</p></div><Button onClick={() => setEditing("new")} disabled={save.busy}>Create account</Button></header>
    <div className="admin-notice">Keep at least one active administrator. Administrators have no counter operating permission.</div>
    <LoadNotice busy={users.busy || counters.busy} error={users.error || counters.error} reload={() => { users.reload(); counters.reload(); }} />
    {save.message && <ToastNotice tone={save.tone}>{save.message}</ToastNotice>}
    {users.data && <>
      <section className="admin-card admin-account-picker" aria-labelledby="account-picker-heading">
        <h2 id="account-picker-heading">View an account</h2>
        <label className="admin-field" htmlFor="staff-account-select">Staff account
          <select id="staff-account-select" value={selectedId} disabled={save.busy || users.busy} onChange={event => setSelectedId(event.target.value)}>
            {!selected && <option value={selectedId}>Account unavailable</option>}
            {options.map(user => <option key={user.id} value={user.id}>{user.login}{user.id === currentUserId ? " (You)" : ""} · {user.role === "ADMIN" ? "Administrator" : "Counter staff"}{!user.active ? " · Inactive" : ""}</option>)}
          </select>
        </label>
        <p className="muted">Your account is shown first. Choose another account to view its details and permissions.</p>
      </section>
      {selected ? <section className="admin-card" aria-labelledby="selected-account-heading">
        <div className="admin-heading"><div><h2 id="selected-account-heading">{selected.login} {selected.id === currentUserId && <span className="badge">You</span>} {Boolean(users.error) && <span className="badge">Last loaded data</span>}</h2><p>Account details and permissions</p></div>
          <div className="admin-actions"><Button variant="secondary" disabled={save.busy || users.busy || Boolean(users.error)} onClick={() => setEditing(selected)}>Edit account</Button>
            {selected.role === "COUNTER_STAFF" && <Button variant="secondary" disabled={save.busy || users.busy || counters.busy || Boolean(users.error || counters.error) || !counters.data} onClick={() => { setGrantUser(selected); setCounterId(""); }}>Manage counter access</Button>}</div>
        </div>
        <dl className="admin-account-facts"><div><dt>Staff login</dt><dd>{selected.login}</dd></div><div><dt>Role</dt><dd>{selected.role === "ADMIN" ? "Administrator" : "Counter staff"}</dd></div><div><dt>Status</dt><dd>{selected.active ? "Active" : "Inactive"}</dd></div></dl>
        {selected.active && selected.role === "ADMIN" && activeAdmins === 1 && <p className="muted">Last active administrator</p>}
        <div className="admin-account-permissions"><h3>Role permissions</h3>
          {!selected.active && <p>Account disabled. This account cannot sign in or use its role permissions.</p>}
          {selected.role === "ADMIN" ? <><ul><li>Manage staff accounts and counter access.</li><li>Enroll and manage card inventory.</li><li>Manage operational settings and reference catalogues.</li><li>View reports and local audit records.</li></ul><p className="muted">Administrators have no counter operating permission.</p></>
            : <><p>Review registrations and issue, return or follow up on passes at explicitly authorised counters.</p><h3>Counter permissions</h3>
              {selected.permissions.length ? <div className="admin-table-scroll" role="region" aria-label="Selected account counter permissions" tabIndex={0}><table><caption>Counter grants for {selected.login}</caption><thead><tr><th>Counter</th><th>Grant</th><th>Effective access</th></tr></thead><tbody>{selected.permissions.map(entry => {
                const counter = counters.data?.find(item => item.id === entry.counterId);
                const access = users.error ? "Account data unavailable" : !selected.active ? "Account inactive" : !entry.active ? "Revoked" : counters.error || !counter ? "Counter details unavailable" : !counter.active ? "Counter inactive" : "Available";
                return <tr key={entry.counterId}><td>{counter ? `${counter.code} · ${counter.name}` : `Counter ID ${entry.counterId}`}</td><td>{entry.active ? "Granted" : "Revoked"}</td><td>{access}</td></tr>;
              })}</tbody></table></div> : <p>No counter permissions assigned.</p>}
            </>}
        </div>
      </section> : <ToastNotice>The selected account is no longer available. Choose another account or refresh the list.</ToastNotice>}
    </>}
    <Dialog.Root open={editing !== null} onOpenChange={(open) => { if (!open && !save.busy) setEditing(null); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content onInteractOutside={preserveToastInteraction} className="dialog-content admin-dialog" onPointerDownOutside={(event) => { if (save.busy) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (save.busy) event.preventDefault(); }}><Dialog.Title>{editing === "new" ? "Create staff account" : "Edit account"}</Dialog.Title><Dialog.Description>Use a staff login. The final active administrator is protected by the server.</Dialog.Description>{editing && <AccountForm key={editing === "new" ? "new" : editing.id} user={editing === "new" ? null : editing} lastAdmin={editing !== "new" && editing.active && editing.role === "ADMIN" && activeAdmins === 1} busy={save.busy} onCancel={() => setEditing(null)} onSubmit={(body) => { void save.run(() => apiClient.command(editing === "new" ? "/api/admin/users" : `/api/admin/users/${editing.id}`, body, savedSchema, { method: editing === "new" ? "POST" : "PATCH", authRequired: true }).execute(), () => setEditing(null)); }} />}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={grantUser !== null} onOpenChange={(open) => { if (!open && !save.busy) setGrantUser(null); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content onInteractOutside={preserveToastInteraction} className="dialog-content admin-dialog"><Dialog.Title>Counter access · {grantUser?.login}</Dialog.Title><Dialog.Description>Grant or revoke one counter. All current sessions of this account will expire.</Dialog.Description><form onSubmit={(event) => { event.preventDefault(); if (!grantUser || !grantCounter) return; void save.run(() => apiClient.command(`/api/admin/users/${grantUser.id}/counters/${counterId}`, { version: permission?.version ?? 0, active: grant, reason }, savedSchema, { method: "PATCH", authRequired: true }).execute(), () => setGrantUser(null)); }}><label className="admin-field">Counter<select required value={counterId} onChange={(event) => setCounterId(event.target.value)}><option value="">Select counter</option>{counters.data?.map((counter) => <option key={counter.id} value={counter.id}>{counter.code} · {counter.name}{!counter.active && " (inactive)"}</option>)}</select></label><label className="admin-field">Permission<select value={String(grant)} onChange={(event) => setGrant(event.target.value === "true")}><option value="true">Grant</option><option value="false">Revoke</option></select></label><ReasonSelect value={reason} onChange={setReason} /><div className="admin-actions"><Button variant="secondary" disabled={save.busy} onClick={() => setGrantUser(null)}>Cancel</Button><Button type="submit" busy={save.busy} disabled={!grantCounter || Boolean(users.error)}>Confirm access change</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}

/** Role/deactivation changes require an explicit confirmation; the browser hint supplements the server's serialized last-admin check. */
function AccountForm({ user, lastAdmin, busy, onCancel, onSubmit }: { user: User | null; lastAdmin: boolean; busy: boolean; onCancel: () => void; onSubmit: (body: unknown) => void }) {
  const [login, setLogin] = useState(""), [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role ?? "COUNTER_STAFF"), [active, setActive] = useState(user?.active ?? true);
  const [reason, setReason] = useState<Reason>(user ? "ACCESS_REVIEW" : "STAFF_ONBOARDING");
  const [confirmed, setConfirmed] = useState(false), [passwordError, setPasswordError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const changed = Boolean(user && (user.role !== role || user.active !== active));
  function submit(event: FormEvent) {
    event.preventDefault();
    setAttempt(value => value + 1);
    if (!user && new TextEncoder().encode(password).length > 72) { setPasswordError("Use at most 72 UTF-8 bytes."); return; }
    if (user) onSubmit({ version: user.version, role, active, reason });
    else { onSubmit({ login, password, role, reason }); setPassword(""); }
  }
  return <form onSubmit={submit}>
    {passwordError && <ToastNotice revision={attempt}>{passwordError}</ToastNotice>}
    {!user && <><InputField id="admin-new-login" label="Staff login" required pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" maxLength={64} autoComplete="off" value={login} onChange={(event) => setLogin(event.target.value)} hint="3–64 ASCII letters, digits, dot, underscore or hyphen." /><InputField id="admin-new-password" label="Initial password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }} error={passwordError} hint="At least 12 characters, at most 72 UTF-8 bytes. Share through an approved private channel." /></>}
    <label className="admin-field">Role<select value={role} disabled={lastAdmin || busy} onChange={(event) => { setRole(event.target.value as User["role"]); setConfirmed(false); }}><option value="COUNTER_STAFF">Counter staff</option><option value="ADMIN">Administrator</option></select></label>
    {user && <label className="admin-check"><input type="checkbox" checked={active} disabled={lastAdmin || busy} onChange={(event) => { setActive(event.target.checked); setConfirmed(false); }} />Active account</label>}
    {lastAdmin && <p className="admin-notice">The last active administrator cannot be disabled or demoted.</p>}
    <ReasonSelect value={reason} onChange={setReason} />
    {changed && <label className="admin-check"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm this role/status change and session revocation.</label>}
    <div className="admin-actions"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" busy={busy} disabled={Boolean(user && !changed) || changed && !confirmed}>Save account</Button></div>
  </form>;
}
