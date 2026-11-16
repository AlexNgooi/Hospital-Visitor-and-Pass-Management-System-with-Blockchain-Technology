import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "./auth-context";
import { apiClient } from "../lib/api-client";
import { safeError } from "../lib/errors";
import { Button, InputField } from "../components/ui/primitives";
import { savedSchema } from "../features/administration/contracts";

/** The server also blocks business APIs; an uncertain change is resolved by signing in again, never by replay. */
export function InitialPasswordPage() {
  const auth = useAuth();
  const [current, setCurrent] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current) return;
    if (password !== confirm || new TextEncoder().encode(password).length > 72) { setMessage("Use matching passwords of at least 12 characters and at most 72 UTF-8 bytes."); return; }
    lock.current = true; setBusy(true); setMessage("");
    try {
      await apiClient.post("/api/auth/change-password", { currentPassword: current, newPassword: password, confirmPassword: confirm }, savedSchema, { authRequired: true });
      setCurrent(""); setPassword(""); setConfirm(""); apiClient.invalidateCsrf(); auth.refresh();
    } catch (error) { setMessage(`${safeError(error)} If the result is uncertain, sign out and sign in with your new password to check.`); }
    finally { lock.current = false; setBusy(false); }
  }
  return <main id="main-content" className="initial-password-page"><section className="admin-card">
    <span className="eyebrow">HSAAS STAFF ACCOUNT</span><h1>Set your own password</h1>
    <p>Replace the emailed temporary password before entering your workspace. You will sign in again after saving.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <InputField id="initial-current" label="Temporary password" type="password" autoComplete="current-password" required value={current} disabled={busy} onChange={event => setCurrent(event.target.value)} />
      <InputField id="initial-new" label="New password" type="password" autoComplete="new-password" minLength={12} required value={password} disabled={busy} hint="At least 12 characters, at most 72 UTF-8 bytes. Pasting and password managers are supported." onChange={event => setPassword(event.target.value)} />
      <InputField id="initial-confirm" label="Confirm new password" type="password" autoComplete="new-password" minLength={12} required value={confirm} disabled={busy} onChange={event => setConfirm(event.target.value)} />
      {message && <p className="admin-inline-error" role="alert">{message}</p>}
      <div className="admin-actions"><Button variant="secondary" disabled={busy} onClick={() => { void auth.logout().catch(() => {}); }}>Sign out</Button><Button type="submit" busy={busy}>Save password</Button></div>
    </form>
  </section></main>;
}
