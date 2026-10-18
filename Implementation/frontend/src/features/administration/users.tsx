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
  if (state.kind !== "authenticated" || state.user.role !== "ADMIN") return <p role="alert">Administrator access required.</p>;
  return <div className="admin-page">
    <header className="admin-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>Staff accounts</h1><p>Manage roles and explicit counter access. Access changes revoke old sessions.</p></div><Button onClick={() => setEditing("new")} disabled={save.busy}>Create account</Button></header>
    <div className="admin-notice">Keep at least one active administrator. Administrators have no counter operating permission.</div>
    <LoadNotice busy={users.busy || counters.busy} error={users.error || counters.error} reload={() => { users.reload(); counters.reload(); }} />
    {save.message && <p role="status" className="admin-notice">{save.message}</p>}
    {users.data && <section className="admin-card"><div className="admin-table-scroll"><table><caption>Current accounts</caption><thead><tr><th>Login</th><th>Role</th><th>Status</th><th>Counter grants</th><th>Actions</th></tr></thead><tbody>{users.data.map((user) => <tr key={user.id}><td>{user.login}{state.user.id === user.id && <span className="badge">You</span>}</td><td>{user.role === "ADMIN" ? "Administrator" : "Counter staff"}</td><td>{user.active ? "Active" : "Inactive"}{user.active && user.role === "ADMIN" && activeAdmins === 1 && <p className="muted">Last active administrator</p>}</td><td>{user.role === "ADMIN" ? "No operating access" : user.permissions.filter((p) => p.active).map((p) => counters.data?.find((c) => c.id === p.counterId)?.code ?? p.counterId).join(", ") || "None"}</td><td><div className="admin-actions"><Button variant="secondary" disabled={save.busy} onClick={() => setEditing(user)}>Edit</Button>{user.role === "COUNTER_STAFF" && <Button variant="secondary" disabled={save.busy || !counters.data} onClick={() => { setGrantUser(user); setCounterId(""); }}>Counter access</Button>}</div></td></tr>)}</tbody></table></div></section>}
    <Dialog.Root open={editing !== null} onOpenChange={(open) => { if (!open && !save.busy) setEditing(null); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content admin-dialog" onPointerDownOutside={(event) => { if (save.busy) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (save.busy) event.preventDefault(); }}><Dialog.Title>{editing === "new" ? "Create staff account" : "Edit account"}</Dialog.Title><Dialog.Description>Use a staff login. The final active administrator is protected by the server.</Dialog.Description>{editing && <AccountForm key={editing === "new" ? "new" : editing.id} user={editing === "new" ? null : editing} lastAdmin={editing !== "new" && editing.active && editing.role === "ADMIN" && activeAdmins === 1} busy={save.busy} onCancel={() => setEditing(null)} onSubmit={(body) => { void save.run(() => apiClient.command(editing === "new" ? "/api/admin/users" : `/api/admin/users/${editing.id}`, body, savedSchema, { method: editing === "new" ? "POST" : "PATCH", authRequired: true }).execute(), () => setEditing(null)); }} />}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={grantUser !== null} onOpenChange={(open) => { if (!open && !save.busy) setGrantUser(null); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content admin-dialog"><Dialog.Title>Counter access · {grantUser?.login}</Dialog.Title><Dialog.Description>Grant or revoke one counter. All current sessions of this account will expire.</Dialog.Description><form onSubmit={(event) => { event.preventDefault(); if (!grantUser || !grantCounter) return; void save.run(() => apiClient.command(`/api/admin/users/${grantUser.id}/counters/${counterId}`, { version: permission?.version ?? 0, active: grant, reason }, savedSchema, { method: "PATCH", authRequired: true }).execute(), () => setGrantUser(null)); }}><label className="admin-field">Counter<select required value={counterId} onChange={(event) => setCounterId(event.target.value)}><option value="">Select counter</option>{counters.data?.map((counter) => <option key={counter.id} value={counter.id}>{counter.code} · {counter.name}{!counter.active && " (inactive)"}</option>)}</select></label><label className="admin-field">Permission<select value={String(grant)} onChange={(event) => setGrant(event.target.value === "true")}><option value="true">Grant</option><option value="false">Revoke</option></select></label><ReasonSelect value={reason} onChange={setReason} /><div className="admin-actions"><Button variant="secondary" disabled={save.busy} onClick={() => setGrantUser(null)}>Cancel</Button><Button type="submit" busy={save.busy} disabled={!grantCounter || Boolean(users.error)}>Confirm access change</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}

/** Role/deactivation changes require an explicit confirmation; the browser hint supplements the server's serialized last-admin check. */
function AccountForm({ user, lastAdmin, busy, onCancel, onSubmit }: { user: User | null; lastAdmin: boolean; busy: boolean; onCancel: () => void; onSubmit: (body: unknown) => void }) {
  const [login, setLogin] = useState(""), [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role ?? "COUNTER_STAFF"), [active, setActive] = useState(user?.active ?? true);
  const [reason, setReason] = useState<Reason>(user ? "ACCESS_REVIEW" : "STAFF_ONBOARDING");
  const [confirmed, setConfirmed] = useState(false), [passwordError, setPasswordError] = useState("");
  const changed = Boolean(user && (user.role !== role || user.active !== active));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!user && new TextEncoder().encode(password).length > 72) { setPasswordError("Use at most 72 UTF-8 bytes."); return; }
    if (user) onSubmit({ version: user.version, role, active, reason });
    else { onSubmit({ login, password, role, reason }); setPassword(""); }
  }
  return <form onSubmit={submit}>
    {!user && <><InputField id="admin-new-login" label="Staff login" required pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" maxLength={64} autoComplete="off" value={login} onChange={(event) => setLogin(event.target.value)} hint="3–64 ASCII letters, digits, dot, underscore or hyphen." /><InputField id="admin-new-password" label="Initial password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }} error={passwordError} hint="At least 12 characters, at most 72 UTF-8 bytes. Share through an approved private channel." /></>}
    <label className="admin-field">Role<select value={role} disabled={lastAdmin || busy} onChange={(event) => { setRole(event.target.value as User["role"]); setConfirmed(false); }}><option value="COUNTER_STAFF">Counter staff</option><option value="ADMIN">Administrator</option></select></label>
    {user && <label className="admin-check"><input type="checkbox" checked={active} disabled={lastAdmin || busy} onChange={(event) => { setActive(event.target.checked); setConfirmed(false); }} />Active account</label>}
    {lastAdmin && <p className="admin-notice">The last active administrator cannot be disabled or demoted.</p>}
    <ReasonSelect value={reason} onChange={setReason} />
    {changed && <label className="admin-check"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm this role/status change and session revocation.</label>}
    <div className="admin-actions"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" busy={busy} disabled={Boolean(user && !changed) || changed && !confirmed}>Save account</Button></div>
  </form>;
}
