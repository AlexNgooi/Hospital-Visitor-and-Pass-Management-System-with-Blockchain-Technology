import { useRef, useState } from "react";
import { Button, InputField } from "../../components/ui/primitives";
import { apiClient } from "../../lib/api-client";
import { ClientError, safeError } from "../../lib/errors";
import { formatMyt } from "../../lib/time";
import { exportSchema, referencesSchema, reportSchema, type Report } from "./contracts";
import { LoadNotice } from "./data";
import { useRemote } from "./hooks";

/** Calendar dates are formatted in MYT, independently of the workstation's own timezone. */
function todayMyt() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

/** History shows full calendar dates and seconds in the agreed hospital timezone, including across midnight. */
function historyTime(value: string) { return new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)); }

/** Filters are applied together so a polling request never mixes a new ward with a previous date range. */
export function ReportsPage() {
  const [today] = useState(todayMyt);
  const [from, setFrom] = useState(today), [to, setTo] = useState(today), [categoryId, setCategory] = useState(""), [destinationId, setDestination] = useState("");
  const [query, setQuery] = useState(new URLSearchParams({ from: today, to: today }).toString());
  const categories = useRemote("/api/admin/categories", referencesSchema), destinations = useRemote("/api/admin/destinations", referencesSchema);
  return <div className="admin-page"><header className="admin-heading"><div><span className="eyebrow">SYNTHETIC DEMONSTRATION DATA</span><h1>Reports & overview</h1><p>MYT calendar dates · masked reporting · automatic refresh every 5 seconds</p></div></header>
    <form className="admin-card admin-filters" onSubmit={(event) => { event.preventDefault(); const next = new URLSearchParams({ from, to }); if (categoryId) next.set("categoryId", categoryId); if (destinationId) next.set("destinationId", destinationId); setQuery(next.toString()); }}>
      <InputField id="report-from" label="From (MYT, inclusive)" type="date" min="2000-01-01" max={to} required value={from} onChange={(event) => setFrom(event.target.value)} /><InputField id="report-to" label="To (MYT, inclusive)" type="date" min={from} max="2100-12-31" required value={to} onChange={(event) => setTo(event.target.value)} />
      <label className="admin-field">Category<select value={categoryId} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}{!category.active && " (inactive)"}</option>)}</select></label><label className="admin-field">Ward / destination<select value={destinationId} onChange={(event) => setDestination(event.target.value)}><option value="">All destinations</option>{destinations.data?.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}{!destination.active && " (inactive)"}</option>)}</select></label><Button type="submit">Apply filters</Button><p className="muted">Maximum date range: 366 calendar days.</p>
    </form><LoadNotice busy={categories.busy || destinations.busy} error={categories.error || destinations.error} reload={() => { categories.reload(); destinations.reload(); }} /><ReportResults key={query} query={query} />
  </div>;
}

/** The last successful snapshot survives a transient outage with a visible stale label; no fallback metrics are invented. */
function ReportResults({ query }: { query: string }) {
  const remote = useRemote(`/api/admin/reports?${query}`, reportSchema, 5000);
  const [exporting, setExporting] = useState(false), [exportMessage, setExportMessage] = useState("");
  const exportLock = useRef(false);
  /** One deliberate export at a time prevents duplicate audit writes before React renders the disabled button. */
  async function download(passes = false) {
    if (exportLock.current) return;
    exportLock.current = true; setExporting(true); setExportMessage("");
    try {
      const result = await apiClient.post(`/api/admin/reports/${passes ? "pass-exports" : "exports"}?${query}`, {}, exportSchema, { authRequired: true });
      // Blob URLs are short lived and never written to persistent browser storage.
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = result.filename; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage(`Exported ${result.rowCount} ${passes ? "pass history rows" : "masked registrations"}. Local audit recorded.`);
    } catch (error) { setExportMessage(error instanceof ClientError && error.code === "EXPORT_TOO_LARGE" ? "Export exceeds the row or size limit. Narrow the date range or filters." : `${safeError(error)} An uncertain download may still have a local export audit. No automatic retry was sent.`); }
    finally { exportLock.current = false; setExporting(false); }
  }
  return <><LoadNotice busy={remote.busy && !remote.data} error={remote.error} reload={remote.reload} />
    {remote.data && <><div className={`admin-notice${remote.stale ? " admin-stale" : ""}`} role="status">{remote.stale ? "STALE · last successful data" : "Current query completed"} · server updated {formatMyt(remote.data.serverUpdatedAt)} · {remote.data.origin}<Button variant="secondary" disabled={remote.busy} onClick={remote.reload}>Refresh now</Button></div>
      <ReportMetrics report={remote.data} />
      {exportMessage && <p role="status" className="admin-notice">{exportMessage}</p>}
      <section className="admin-card"><div className="admin-heading"><div><h2>Pass issue & return history</h2><p>First 50 passes issued, actually returned or closed lost in the selected MYT period. Each pass appears once, even when several events fall in the period.</p></div><Button busy={exporting} disabled={remote.stale || remote.busy} onClick={() => { void download(true); }}>Export pass history CSV</Button></div>
        <p>Issue = in; actual return = out. These are staff handover records. Lost closures keep a separate closure date and have no actual return. Exports contain pass metadata and staff IDs with no visitor or patient details. Limit: 10,000 rows and a bounded 1 MiB response.</p><PassHistory report={remote.data} /></section>
      <section className="admin-card"><div className="admin-heading"><div><h2>Masked registration preview</h2><p>{remote.data.from} to {remote.data.to}, inclusive MYT · first 50 registrations</p></div><Button busy={exporting} disabled={remote.stale || remote.busy} onClick={() => { void download(); }}>Export masked CSV</Button></div><p>Export includes registration metadata only; visitor labels are fully masked. Up to 10,000 rows, within a 1 MiB response limit per export.</p>
        <div className="admin-table-scroll" role="region" aria-label="Registration report" tabIndex={0}><table><caption>Registration activity in the selected period · requested destinations</caption><thead><tr><th>Reference</th><th>Visitor</th><th>Category</th><th>Ward / destinations</th><th>Status</th><th>Submitted (MYT)</th></tr></thead><tbody>{remote.data.preview.slice(0, 50).map((row) => <tr key={row.reference}><td>{row.reference}</td><td>{row.visitor}</td><td>{row.category}</td><td>{row.destination}</td><td>{row.status}</td><td>{historyTime(row.submittedAt)}</td></tr>)}</tbody></table></div>{remote.data.preview.length > 50 && <p>More registrations match. Use the bounded CSV export or narrow the filters.</p>}{!remote.data.preview.length && <p>No registrations in this period.</p>}
      </section></>}
  </>;
}

/** A separate pass table makes partial returns and no-deadline borrowing visible without multiplying visitor rows. */
function PassHistory({ report }: { report: Report }) {
  return <><div className="admin-table-scroll" role="region" aria-label="Pass history report" tabIndex={0}><table><caption>Pass activity · full MYT dates/times · staff actor IDs</caption><thead><tr><th>Registration</th><th>Pass / card</th><th>Category / issued destination</th><th>Status</th><th>Issued / in</th><th>Return deadline</th><th>Actually returned / out</th><th>Closure</th><th>Method / origin</th></tr></thead><tbody>{report.passPreview.slice(0, 50).map((row) => <tr key={row.passReference}><td>{row.reference}</td><td>{row.passReference}<br />{row.cardCode}</td><td>{row.category}<br />{row.destination}</td><td>{row.status}</td><td>{historyTime(row.issuedAt)}<br />Staff ID {row.issuedBy}</td><td>{row.dueAt ? historyTime(row.dueAt) : "No return deadline"}</td><td>{row.returnedAt ? <>{historyTime(row.returnedAt)}<br />Staff ID {row.returnedBy}</> : "Not returned"}</td><td>{row.closedAt ? <>{historyTime(row.closedAt)}<br />Staff ID {row.closedBy ?? "Unavailable"}{row.status === "LOST" && <><br />Closed lost</>}</> : "Open"}</td><td>{row.operationMethod}<br />{row.origin}</td></tr>)}</tbody></table></div>{report.passPreview.length > 50 && <p>More passes match. Use the bounded CSV export or narrow the filters.</p>}{!report.passPreview.length && <p>No issue, actual return or lost-closure activity in this period.</p>}</>;
}

/** Period counts, current assignment counts and category-only inventory have separate headings and denominator definitions. */
function ReportMetrics({ report }: { report: Report }) {
  const metric = (key: string) => report.metrics.find((item) => item.metric === key)?.amount;
  const period = [["visits", "Registrations submitted"], ["issuedRegistrations", "Distinct registrations issued passes"], ["issued", "Passes issued"], ["returned", "Passes actually returned"], ["lost", "Passes closed lost"]];
  const current = [["openRegistrations", "Distinct registrations with open passes"], ["inUse", "Open passes (includes overdue)"], ["noDeadline", "Open passes without deadline"], ["overdue", "Open passes with deadline reached"], ["available", "Available cards"], ["inventory", "All enrolled cards"]];
  const categories = report.metrics.filter((item) => item.metric === "category");
  const days = report.metrics.filter((item) => item.metric === "day").sort((a, b) => a.label.localeCompare(b.label));
  const denominator = metric("inventory"), issuedCards = metric("issuedCards");
  return <><section><h2>Selected period activity</h2><p>Registrations submitted use their requested destinations. Issue, actual return and lost-closure counts use their own timestamps and actual issued destination. One registration with three passes counts as one registration and three passes; registrations do not mean distinct people.</p><div className="admin-metrics">{period.map(([key, label]) => <div className="admin-card" key={key}><span>{label}</span><strong>{metric(key) ?? "Unavailable"}</strong></div>)}</div></section>
    <section><h2>Current as of {formatMyt(report.serverUpdatedAt)}</h2><p>Current open/overdue counts ignore historical dates. Category and actual issued destination still apply. Passes without a deadline remain open and require return; they are excluded from overdue.</p><div className="admin-metrics">{current.map(([key, label]) => <div className="admin-card" key={key}><span>{label}</span><strong>{metric(key) ?? "Unavailable"}</strong></div>)}</div><p className="admin-notice">Inventory and utilisation apply the category filter only and ignore the selected issued-destination filter. Issued-card fraction = ISSUED/OVERDUE cards ÷ all enrolled cards, including lost/disabled cards: {denominator === undefined || issuedCards === undefined ? "Unavailable" : denominator === 0 ? "No enrolled cards" : `${issuedCards} / ${denominator} (${(100 * issuedCards / denominator).toFixed(1)}%)`}.</p></section>
    <div className="admin-two-col"><section className="admin-card"><h2>Registrations by category</h2>{categories.length ? categories.map((item) => <div className="admin-bar" key={item.label}><span>{item.label}</span><strong>{item.amount}</strong><meter min={0} max={Math.max(1, metric("visits") ?? 1)} value={item.amount}>{item.amount}</meter></div>) : <p>No registrations in this period.</p>}</section><section className="admin-card"><h2>Daily registration trend (MYT)</h2><p className="muted">Only dates with submissions are listed.</p><div className="admin-trend">{days.map((day) => <div key={day.label}><span>{day.label}</span><strong>{day.amount}</strong></div>)}{!days.length && <p>No registration activity.</p>}</div></section></div>
  </>;
}
