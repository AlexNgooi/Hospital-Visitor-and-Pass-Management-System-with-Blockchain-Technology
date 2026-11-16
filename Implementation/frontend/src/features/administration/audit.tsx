import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Button, InputField } from "../../components/ui/primitives";
import { formatMyt } from "../../lib/time";
import { auditSchema, usersSchema } from "./contracts";
import { LoadNotice } from "./data";
import { useRemote } from "./hooks";

const actions: Record<string, string> = {
  ADMIN_CHANGED: "Administration changed", ADMIN_BOOTSTRAPPED: "Administrator initialized", REGISTRATION_SUBMITTED: "Registration submitted", REGISTRATION_VERIFIED: "Registration approved", REGISTRATION_REJECTED: "Registration rejected", REGISTRATION_NO_PASS: "No pass recorded", REGISTRATION_REVIEW_FIELDS_VIEWED: "Registration details viewed", CARD_REGISTERED: "Pass added", CARD_RENAMED: "Pass renamed", ISSUED: "Pass issued", RETURNED: "Pass returned", OVERDUE: "Pass overdue", MARKED_LOST: "Pass marked lost", DISABLED: "Pass disabled", RESTORED: "Pass restored", CONTACT_REVEALED: "Contact details viewed", FOLLOWUP_RECORDED: "Follow-up recorded", REPORT_EXPORTED: "Report exported", PASSWORD_CHANGED: "Initial password replaced", STAFF_EMAIL_REQUESTED: "Initial password email requested",
};
const fields: Record<string, string> = { previousState: "Previous state", state: "State", previousVersion: "Previous version", version: "Version", origin: "Source", role: "Account type", active: "Active", code: "Code", name: "Name", setting_key: "Setting", value_int: "Value", exportKind: "Export type", rowCount: "Rows", from: "Start date", to: "End date", categoryId: "Visitor type ID", destinationId: "Destination ID", snapshotUpdatedAt: "Snapshot time" };
type SafeValues = Record<string, string | number | boolean | null>;
/** Only existing safe snapshot fields are rendered; unknown properties never become a raw JSON panel. */
function values(input: string | null): SafeValues {
  if (!input) return {};
  try { const parsed: unknown = JSON.parse(input); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}; return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => fields[key] && (value === null || ["string", "number", "boolean"].includes(typeof value)))) as SafeValues; }
  catch { return {}; }
}
function display(value: unknown) { return value === null || value === undefined ? "—" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value); }

/** Events and configuration history have separate tabs because their records have independent identities. */
export function AuditPage() {
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [from, setFrom] = useState(today), [to, setTo] = useState(today), [actor, setActor] = useState(""), [action, setAction] = useState(""), [module, setModule] = useState("");
  const [query, setQuery] = useState(new URLSearchParams({ from: today, to: today }).toString());
  const users = useRemote("/api/admin/users", usersSchema);
  return <div className="admin-page"><header className="admin-heading"><div><h1>System audit</h1><p>Review staff actions and recorded system changes.</p></div></header>
    <div className="admin-local-notice"><ShieldCheck size={18} aria-hidden="true" /><strong>Local audit records</strong><span>Blockchain is not enabled.</span></div>
    <form className="admin-card admin-filters" onSubmit={event => { event.preventDefault(); const next = new URLSearchParams({ from, to }); if (actor) next.set("actorId", actor); if (action) next.set("action", action); if (module) next.set("module", module); setQuery(next.toString()); }}>
      <InputField id="audit-from" label="Start date (MYT)" type="date" required min="2000-01-01" max={to} value={from} onChange={event => setFrom(event.target.value)} /><InputField id="audit-to" label="End date (MYT)" type="date" required min={from} max="2100-12-31" value={to} onChange={event => setTo(event.target.value)} />
      <label className="admin-field">Staff<select value={actor} onChange={event => setActor(event.target.value)}><option value="">All staff / system</option>{users.data?.map(user => <option key={user.id} value={user.id}>{user.fullName} ({user.login})</option>)}</select></label>
      <label className="admin-field">Event action<select value={action} onChange={event => setAction(event.target.value)}><option value="">All actions</option>{Object.entries(actions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="admin-field">Module<select value={module} onChange={event => setModule(event.target.value)}><option value="">All modules</option><option value="staff">Staff accounts</option><option value="passes">Pass inventory / loans</option><option value="registration">Registrations</option><option value="reports">Reports</option><option value="settings">Existing settings</option></select></label><Button type="submit">Apply filters</Button>
    </form><LoadNotice busy={users.busy} error={users.error} reload={users.reload} /><AuditResults key={query} query={query} users={users.data ?? []} />
  </div>;
}
function AuditResults({ query, users }: { query: string; users: { id: string; fullName: string; login: string }[] }) {
  const [page, setPage] = useState(0), [tab, setTab] = useState<"events" | "changes">("events");
  const data = useRemote(`/api/admin/audit-events?${query}&page=${page}`, auditSchema);
  const [selected, setSelected] = useState<string | null>(null);
  const event = selected?.startsWith("event:") ? data.data?.events.find(item => item.id === selected.slice(6)) : undefined;
  const change = selected?.startsWith("change:") ? data.data?.changes.find(item => item.id === selected.slice(7)) : undefined;
  const actor = (id: string | null) => id === null ? "System" : users.find(user => user.id === id)?.fullName ?? `Staff ID ${id}`;
  const before = values(change?.previousValue ?? null), after = values(change?.currentValue ?? null), snapshot = values(event?.snapshot ?? null);
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return <><LoadNotice busy={data.busy} error={data.error} reload={data.reload} />{data.data && <>
    <div className="admin-audit-tabs"><Button variant={tab === "events" ? "primary" : "secondary"} aria-pressed={tab === "events"} onClick={() => { setTab("events"); setSelected(null); setPage(0); }}>Business events</Button><Button variant={tab === "changes" ? "primary" : "secondary"} aria-pressed={tab === "changes"} onClick={() => { setTab("changes"); setSelected(null); setPage(0); }}>Configuration changes</Button></div>
    <p className="muted">Updated {formatMyt(data.data.serverUpdatedAt)} MYT · Page {page + 1}{tab === "changes" && " · Event action filter applies only to Business events"}</p>
    <div className={`admin-audit-layout${event || change ? " has-selection" : ""}`}><section className="admin-card admin-audit-table"><div className="admin-table-scroll" role="region" aria-label={tab === "events" ? "Business events" : "Configuration changes"} tabIndex={0}><table><thead><tr><th>Time (MYT)</th><th>Staff</th><th>{tab === "events" ? "Action" : "Change"}</th><th>Record</th><th>Details</th></tr></thead><tbody>
      {tab === "events" ? data.data.events.map(item => <tr key={item.id} className={selected === `event:${item.id}` ? "is-selected" : ""}><td>{formatMyt(item.occurredAt)}</td><td>{actor(item.actorId)}</td><td>{actions[item.action] ?? item.action.replaceAll("_", " ")}</td><td>{item.target}</td><td><Button variant="ghost" onClick={() => setSelected(`event:${item.id}`)} aria-label={`View ${actions[item.action] ?? item.action} at ${formatMyt(item.occurredAt)}`}>View details</Button></td></tr>) : data.data.changes.map(item => <tr key={item.id} className={selected === `change:${item.id}` ? "is-selected" : ""}><td>{formatMyt(item.occurredAt)}</td><td>{actor(item.actorId)}</td><td>{item.kind.replaceAll("_", " ")}</td><td>{item.target}</td><td><Button variant="ghost" onClick={() => setSelected(`change:${item.id}`)}>View details</Button></td></tr>)}
    </tbody></table></div>{!(tab === "events" ? data.data.events.length : data.data.changes.length) && <p className="admin-empty">No records match these filters.</p>}</section>
    {(event || change) && <section className="admin-card admin-audit-detail" aria-label="Selected audit record" aria-live="polite"><div className="admin-dialog-heading"><h2>{event ? "Event details" : "Change details"}</h2><Button variant="ghost" aria-label="Close audit details" onClick={() => setSelected(null)}><X size={18} aria-hidden="true" /></Button></div>
      <h3>{event ? actions[event.action] ?? event.action : change!.kind}</h3><dl><dt>Date / time (MYT)</dt><dd>{formatMyt((event ?? change)!.occurredAt)}</dd><dt>Staff</dt><dd>{actor((event ?? change)!.actorId)}</dd><dt>Record</dt><dd>{event?.target ?? change?.target}</dd></dl>
      {event && <dl>{Object.entries(snapshot).map(([key, value]) => <div key={key}><dt>{fields[key]}</dt><dd>{display(value)}</dd></div>)}</dl>}
      {change && <><div className="admin-table-scroll" role="region" aria-label="Before and after comparison" tabIndex={0}><table><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{keys.map(key => <tr key={key}><td>{fields[key]}</td><td>{display(before[key])}</td><td>{display(after[key])}</td></tr>)}</tbody></table></div><p className="muted">Version {change.previousVersion ?? "New"} → {change.version}</p></>}
      <p className="muted">Recorded automatically · {event?.id ?? change?.id}</p>
    </section>}
    </div><div className="admin-actions"><Button variant="secondary" disabled={page === 0 || data.busy} onClick={() => { setSelected(null); setPage(value => value - 1); }}>Previous</Button><Button variant="secondary" disabled={page >= 1000 || data.busy || !(tab === "events" ? data.data.moreEvents : data.data.moreHistory)} onClick={() => { setSelected(null); setPage(value => value + 1); }}>Next</Button><Button variant="secondary" disabled={data.busy} onClick={() => { setSelected(null); data.reload(); }}>Refresh</Button></div>
  </>}</>;
}
