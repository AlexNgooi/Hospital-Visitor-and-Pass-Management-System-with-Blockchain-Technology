import { useEffect, useRef, useState } from "react";
import { Download, ImageDown, RefreshCw } from "lucide-react";
import { z } from "zod";
import { Button, InputField } from "../../components/ui/primitives";
import { ToastNotice } from "../../components/ui/toast";
import { apiClient } from "../../lib/api-client";
import { ClientError, safeError } from "../../lib/errors";
import { formatMyt } from "../../lib/time";
import { exportSchema, referencesSchema, reportSchema, type Report } from "./contracts";
import { LoadNotice } from "./data";
import { useRemote } from "./hooks";
import { CategoryChart, InventoryChart, TrendChart } from "./charts";
import { metric, series, categoryLabels } from "./chart-data";
import { chartImage, downloadBlob } from "./chart-export";

const chartReceipt = z.object({ id: z.uuid(), recordedAt: z.iso.datetime() });
function todayMyt() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

/** The single administrator overview replaces the old shortcut/report split and applies filters together. */
export function ReportsPage() {
  const [today] = useState(todayMyt), [period, setPeriod] = useState("month");
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`), [to, setTo] = useState(today), [category, setCategory] = useState(""), [destination, setDestination] = useState("");
  const [query, setQuery] = useState(new URLSearchParams({ from, to }).toString());
  const categories = useRemote("/api/admin/categories", referencesSchema), destinations = useRemote("/api/admin/destinations", referencesSchema);
  function preset(value: string) { const current = todayMyt(); setPeriod(value); if (value !== "custom") { setFrom(value === "day" ? current : value === "year" ? `${current.slice(0, 4)}-01-01` : `${current.slice(0, 7)}-01`); setTo(current); } }
  const applied = new URLSearchParams(query);
  const scope = `${categories.data?.find(item => item.id === applied.get("categoryId"))?.name ?? "All visitor types"} · ${destinations.data?.find(item => item.id === applied.get("destinationId"))?.name ?? "All destinations"}`;
  return <div className="admin-page admin-overview">
    <header className="admin-heading"><div><h1>Overview</h1><p>Visitor activity and pass performance.</p></div></header>
    <form className="admin-card admin-filters admin-overview-filters" onSubmit={event => { event.preventDefault(); const next = new URLSearchParams({ from, to }); if (category) next.set("categoryId", category); if (destination) next.set("destinationId", destination); setQuery(next.toString()); }}>
      <label className="admin-field">Time period<select value={period} onChange={event => preset(event.target.value)}><option value="day">This day</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Customize</option></select></label>
      {period === "custom" ? <><InputField id="report-from" label="Start date (MYT)" type="date" min="2000-01-01" max={to} required value={from} onChange={event => setFrom(event.target.value)} /><InputField id="report-to" label="End date (MYT)" type="date" min={from} max="2100-12-31" required value={to} onChange={event => setTo(event.target.value)} /></> : <p className="admin-period-caption">{from} — {to}<small>MYT · inclusive dates</small></p>}
      <label className="admin-field">Visitor type<select value={category} onChange={event => setCategory(event.target.value)}><option value="">All visitor types</option>{categories.data?.map(item => <option key={item.id} value={item.id}>{item.name}{!item.active && " (inactive)"}</option>)}</select></label>
      <label className="admin-field">Destination<select value={destination} onChange={event => setDestination(event.target.value)}><option value="">All destinations</option>{destinations.data?.map(item => <option key={item.id} value={item.id}>{item.name}{!item.active && " (inactive)"}</option>)}</select></label><Button type="submit">Apply</Button>
    </form>
    <LoadNotice busy={categories.busy || destinations.busy} error={categories.error || destinations.error} reload={() => { categories.reload(); destinations.reload(); }} />
    <ReportResults key={query} query={query} scope={scope} referencesReady={Boolean(categories.data && destinations.data && !categories.error && !destinations.error)} />
  </div>;
}

/** Failed polling retains a labelled snapshot; exports require fresh authorized data and never retry themselves. */
function ReportResults({ query, scope, referencesReady }: { query: string; scope: string; referencesReady: boolean }) {
  const remote = useRemote(`/api/admin/reports?${query}`, reportSchema, 5000);
  const [exporting, setExporting] = useState(false), [message, setMessage] = useState(""), [tone, setTone] = useState<"success" | "error">("success");
  const lock = useRef(false), alive = useRef(true), charts = useRef<HTMLDivElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function download(image: boolean) {
    if (lock.current || !remote.data || remote.stale || !referencesReady) return;
    const snapshot = remote.data;
    const svgs = Array.from(charts.current?.querySelectorAll<SVGSVGElement>("svg[data-report-chart]") ?? []).map(svg => {
      // Explicit intrinsic dimensions keep text sharp when the exported SVG is decoded as an image.
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", "1300"); clone.setAttribute("height", "560");
      return new XMLSerializer().serializeToString(clone);
    });
    lock.current = true; setExporting(true); setMessage("");
    try {
      if (image) {
        const blob = await chartImage(snapshot, scope, svgs); if (!alive.current) return;
        await apiClient.post(`/api/admin/reports/chart-exports?${query}`, { snapshotUpdatedAt: snapshot.serverUpdatedAt }, chartReceipt, { authRequired: true });
        if (alive.current) downloadBlob(blob, `hsaas-charts-${snapshot.from}-${snapshot.to}.png`);
      } else {
        const result = await apiClient.post(`/api/admin/reports/compiled-exports?${query}`, {}, exportSchema, { authRequired: true });
        if (alive.current) downloadBlob(new Blob([result.csv], { type: "text/csv;charset=utf-8" }), result.filename);
      }
      if (alive.current) { setTone("success"); setMessage(image ? "Chart image exported. Export audit recorded." : "Compiled CSV exported with all matching report rows and summary metrics. Export audit recorded."); }
    } catch (error) { if (alive.current) { setTone("error"); setMessage(error instanceof ClientError && error.code === "EXPORT_TOO_LARGE" ? "The complete export exceeds 10,000 rows or the response size limit. Narrow the range; no partial CSV was produced." : `${safeError(error)} An uncertain download may still have an export audit. No automatic retry was sent.`); } }
    finally { lock.current = false; if (alive.current) setExporting(false); }
  }
  return <><LoadNotice busy={remote.busy && !remote.data} error={remote.error} reload={remote.reload} />
    {remote.data && <>
      <div className="admin-report-toolbar"><p role="status" className={remote.stale ? "admin-inline-error" : "muted"}>{remote.stale ? "Stale · last successful data" : "Updated"} {formatMyt(remote.data.serverUpdatedAt)} MYT · {remote.data.origin}</p><div className="admin-actions"><Button variant="secondary" disabled={remote.busy || exporting} onClick={remote.reload}><RefreshCw size={17} aria-hidden="true" />Refresh</Button><Button variant="secondary" disabled={remote.stale || exporting || !referencesReady} onClick={() => { void download(false); }}><Download size={17} aria-hidden="true" />Export CSV</Button><Button disabled={remote.stale || exporting || !referencesReady} busy={exporting} onClick={() => { void download(true); }}><ImageDown size={17} aria-hidden="true" />Export charts</Button></div></div>
      {message && <ToastNotice tone={tone}>{message}</ToastNotice>}
      <section><h2>Selected period</h2><div className="admin-metrics">{[["visits", "Registrations"], ["issued", "Passes issued"], ["returned", "Passes returned"], ["lost", "Passes closed lost"]].map(([key, label]) => <MetricCard key={key} report={remote.data!} metricKey={key} label={label} />)}</div></section>
      <section><h2>Current snapshot</h2><div className="admin-metrics admin-current-metrics">{[["inUse", "Unreturned passes"], ["overdue", "Overdue · included in unreturned"], ["noDeadline", "No deadline · included in unreturned"]].map(([key, label]) => <MetricCard key={key} report={remote.data!} metricKey={key} label={label} />)}</div></section>
      <div ref={charts} className="admin-chart-grid"><section className="admin-card"><h2>Daily registrations</h2><TrendChart report={remote.data} /></section><section className="admin-card"><h2>Registrations by visitor type</h2><CategoryChart report={remote.data} /></section><section className="admin-card"><h2>Pass issues & actual returns</h2><TrendChart report={remote.data} movement /></section><section className="admin-card"><h2>Pass inventory · All destinations</h2><InventoryChart report={remote.data} /></section></div>
      <p className="admin-report-note">Registrations and passes are counted separately. Current unreturned counts ignore historical dates. Inventory uses the category filter only. Issue = staff handover; actual return = receipt of the pass. Lost closures have no return time.</p>
      <ReportData report={remote.data} />
    </>}
  </>;
}
function MetricCard({ report, metricKey, label }: { report: Report; metricKey: string; label: string }) { return <div className="admin-card"><span>{label}</span><strong>{metric(report, metricKey)?.toLocaleString() ?? "Unavailable"}</strong></div>; }

/** Accessible numeric alternatives remain available alongside the charts; exports include all matches, not these previews. */
function ReportData({ report }: { report: Report }) {
  const issued = series(report, "dayIssued"), returned = series(report, "dayReturned");
  return <details className="admin-card admin-report-data"><summary>View data tables and report details</summary>
    <h2>Summary metrics</h2><div className="admin-table-scroll" role="region" aria-label="Summary metrics" tabIndex={0}><table><thead><tr><th>Metric</th><th>Group</th><th>Count</th></tr></thead><tbody>{report.metrics.filter(item => !["day", "dayIssued", "dayReturned"].includes(item.metric)).map(item => <tr key={`${item.metric}:${item.label}`}><td>{item.metric}</td><td>{categoryLabels[item.label] ?? item.label}</td><td>{item.amount}</td></tr>)}</tbody></table></div>
    <h2>Daily values (MYT)</h2><div className="admin-table-scroll admin-daily-values" role="region" aria-label="Daily chart values" tabIndex={0}><table><thead><tr><th>Date</th><th>Registrations</th><th>Passes issued</th><th>Passes returned</th></tr></thead><tbody>{series(report, "day").map((day, index) => <tr key={day.label}><td>{day.label}</td><td>{day.amount}</td><td>{issued[index]?.amount}</td><td>{returned[index]?.amount}</td></tr>)}</tbody></table></div>
    <h2>Registration preview</h2><p>First 50 matching registrations · masked. CSV includes the complete matching result or fails explicitly at its limit.</p><div className="admin-table-scroll" role="region" aria-label="Registration preview" tabIndex={0}><table><thead><tr><th>Reference</th><th>Visitor type</th><th>Requested destinations</th><th>Status</th><th>Submitted (MYT)</th></tr></thead><tbody>{report.preview.slice(0, 50).map(row => <tr key={row.reference}><td>{row.reference}</td><td>{categoryLabels[row.category] ?? row.category}</td><td>{row.destination}</td><td>{row.status}</td><td>{formatMyt(row.submittedAt)}</td></tr>)}</tbody></table></div>
    <h2>Pass activity preview</h2><div className="admin-table-scroll" role="region" aria-label="Pass activity preview" tabIndex={0}><table><thead><tr><th>Pass / registration</th><th>Visitor type / destination</th><th>Status</th><th>Issued / in (MYT)</th><th>Deadline (MYT)</th><th>Returned / out (MYT)</th><th>Closed (MYT)</th></tr></thead><tbody>{report.passPreview.slice(0, 50).map(row => <tr key={row.passReference}><td><strong>{row.cardCode}</strong><small>{row.passReference}</small><small>{row.reference}</small></td><td>{categoryLabels[row.category] ?? row.category}<small>{row.destination}</small></td><td>{row.status}</td><td>{formatMyt(row.issuedAt)}<small>Staff {row.issuedBy}</small></td><td>{row.dueAt ? formatMyt(row.dueAt) : "No return deadline"}</td><td>{row.returnedAt ? formatMyt(row.returnedAt) : "Not returned"}<small>{row.returnedBy && `Staff ${row.returnedBy}`}</small></td><td>{row.closedAt ? formatMyt(row.closedAt) : "Open"}<small>{row.closedBy && `Staff ${row.closedBy}`}</small></td></tr>)}</tbody></table></div>
  </details>;
}
