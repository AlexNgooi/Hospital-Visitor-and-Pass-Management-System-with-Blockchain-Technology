import { useState } from "react";
import { Button, InputField } from "../../components/ui/primitives";
import { formatMyt } from "../../lib/time";
import { auditSchema } from "./contracts";
import { LoadNotice } from "./data";
import { useRemote } from "./hooks";

/** The local audit browser makes unavailable blockchain/notification functions explicit and offers no fake verify/retry controls. */
export function AuditPage() {
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date()));
  const [from, setFrom] = useState(today), [to, setTo] = useState(today), [actor, setActor] = useState(""), [action, setAction] = useState("");
  const [query, setQuery] = useState(new URLSearchParams({ from: today, to: today }).toString());
  return <div className="admin-page"><header className="admin-heading"><div><span className="eyebrow">LOCAL_ONLY</span><h1>Local audit</h1><p>Protected business events and immutable administration changes.</p></div></header><div className="admin-notice">Blockchain NOT_ENABLED. These are local transaction records, with no on-chain proof, external send or delivery claim.</div>
    <form className="admin-card admin-filters" onSubmit={(event) => { event.preventDefault(); const next = new URLSearchParams({ from, to }); if (actor) next.set("actorId", actor); if (action) next.set("action", action); setQuery(next.toString()); }}><InputField id="audit-from" label="From (MYT)" type="date" required min="2000-01-01" max={to} value={from} onChange={(event) => setFrom(event.target.value)} /><InputField id="audit-to" label="To (MYT, inclusive)" type="date" required min={from} max="2100-12-31" value={to} onChange={(event) => setTo(event.target.value)} /><InputField id="audit-actor" label="Actor account ID (optional)" inputMode="numeric" pattern="[1-9][0-9]{0,18}" value={actor} onChange={(event) => setActor(event.target.value)} /><label className="admin-field">Event action<select value={action} onChange={(event) => setAction(event.target.value)}><option value="">All actions</option>{["ADMIN_CHANGED", "ADMIN_BOOTSTRAPPED", "REGISTRATION_SUBMITTED", "REGISTRATION_VERIFIED", "REGISTRATION_REJECTED", "CARD_REGISTERED", "ISSUED", "RETURNED", "OVERDUE", "MARKED_LOST", "DISABLED", "RESTORED", "CONTACT_REVEALED", "FOLLOWUP_RECORDED", "REPORT_EXPORTED"].map((value) => <option key={value}>{value}</option>)}</select></label><Button type="submit">Apply filters</Button></form><AuditResults key={query} query={query} />
  </div>;
}

/** Paging is bounded and rekeys the read so a filter/page change cannot display a previous page's data. */
function AuditResults({ query }: { query: string }) {
  const [page, setPage] = useState(0);
  return <AuditData key={page} query={query} page={page} setPage={setPage} />;
}
function AuditData({ query, page, setPage }: { query: string; page: number; setPage: (page: number) => void }) {
  const data = useRemote(`/api/admin/audit-events?${query}&page=${page}`, auditSchema);
  return <><LoadNotice busy={data.busy} error={data.error} reload={data.reload} />{data.data && <><p className="muted">Server updated {formatMyt(data.data.serverUpdatedAt)} · page {page + 1}</p><section className="admin-card"><h2>Business event stream</h2><div className="admin-table-scroll"><table><caption>Safe event snapshots · date, actor and action filters</caption><thead><tr><th>Time (MYT)</th><th>Action</th><th>Target</th><th>Actor ID</th><th>Safe values</th></tr></thead><tbody>{data.data.events.map((event) => <tr key={event.id}><td>{formatMyt(event.occurredAt)}</td><td>{event.action}</td><td>{event.target}</td><td>{event.actorId ?? "SYSTEM"}</td><td><details><summary>View safe snapshot</summary><pre>{event.snapshot}</pre><small>Event {event.id}</small></details></td></tr>)}</tbody></table></div>{!data.data.events.length && <p>No local events match these filters.</p>}</section>
    <section className="admin-card"><h2>Administration change history</h2><p>Date and actor filters apply here. Event-action selection applies to the business event stream above.</p><div className="admin-table-scroll"><table><caption>Immutable versions and reason codes</caption><thead><tr><th>Time (MYT)</th><th>Object</th><th>Version</th><th>Reason</th><th>Actor ID</th><th>Before / after</th></tr></thead><tbody>{data.data.changes.map((change) => <tr key={change.id}><td>{formatMyt(change.occurredAt)}</td><td>{change.kind}:{change.target}</td><td>{change.previousVersion ?? "New"} → {change.version}</td><td>{change.reason}</td><td>{change.actorId}</td><td><details><summary>View safe change</summary><p>Before</p><pre>{change.previousValue ?? "No prior value"}</pre><p>After</p><pre>{change.currentValue ?? "Structural event only"}</pre></details></td></tr>)}</tbody></table></div>{!data.data.changes.length && <p>No administration changes in this period.</p>}</section><div className="admin-actions"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous page</Button><Button variant="secondary" disabled={page >= 1000 || !data.data.moreEvents && !data.data.moreHistory} onClick={() => setPage(page + 1)}>Next page</Button><Button variant="secondary" onClick={data.reload}>Refresh</Button></div></>}</>;
}
