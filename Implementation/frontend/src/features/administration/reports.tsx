import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Download, ImageDown, RefreshCw } from "lucide-react";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { Button, InputField } from "../../components/ui/primitives";
import { ToastNotice } from "../../components/ui/toast";
import { apiClient } from "../../lib/api-client";
import { ClientError, safeError } from "../../lib/errors";
import { formatMyt } from "../../lib/time";
import { exportSchema, referencesSchema, reportSchema, type Report } from "./contracts";
import { LoadNotice } from "./data";
import { useRemote } from "./hooks";
import { CategoryChart, InventoryChart, TrendChart } from "./charts";
import { metric } from "./chart-data";
import { reportQuery } from "./report-query";
import { chartImage, downloadBlob } from "./chart-export";

const chartReceipt = z.object({ id: z.uuid(), recordedAt: z.iso.datetime() });
function todayMyt() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

/** The single administrator overview replaces the old shortcut/report split and applies filters together. */
export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const [initialQuery] = useState(() => { const today = todayMyt(); return reportQuery(params) ?? new URLSearchParams({ from: `${today.slice(0, 7)}-01`, to: today }).toString(); });
  const initial = new URLSearchParams(initialQuery);
  // Returning from details preserves the matching preset instead of expanding custom-date controls unnecessarily.
  const [period, setPeriod] = useState(() => {
    const today = todayMyt();
    if (!params.size) return "month";
    if (initial.get("to") !== today) return "custom";
    if (initial.get("from") === today) return "day";
    if (initial.get("from") === `${today.slice(0, 7)}-01`) return "month";
    if (initial.get("from") === `${today.slice(0, 4)}-01-01`) return "year";
    return "custom";
  });
  const [from, setFrom] = useState(initial.get("from")!), [to, setTo] = useState(initial.get("to")!), [category, setCategory] = useState(initial.get("categoryId") ?? ""), [destination, setDestination] = useState(initial.get("destinationId") ?? "");
  const [query, setQuery] = useState(initialQuery);
  const categories = useRemote("/api/admin/categories", referencesSchema), destinations = useRemote("/api/admin/destinations", referencesSchema);
  function preset(value: string) { const current = todayMyt(); setPeriod(value); if (value !== "custom") { setFrom(value === "day" ? current : value === "year" ? `${current.slice(0, 4)}-01-01` : `${current.slice(0, 7)}-01`); setTo(current); } }
  const applied = new URLSearchParams(query);
  const scope = `${categories.data?.find(item => item.id === applied.get("categoryId"))?.name ?? "All visitor types"} · ${destinations.data?.find(item => item.id === applied.get("destinationId"))?.name ?? "All destinations"}`;
  return <div className="admin-page admin-overview">
    <header className="admin-heading"><div><h1>Overview</h1><p>Visitor activity and pass performance.</p></div><Link className="button button-secondary admin-details-button" to={`/admin/report-details?${query}`} target="_blank" rel="noopener noreferrer" aria-label="View report details (opens in a new tab)">View details<ArrowUpRight size={17} aria-hidden="true" /></Link></header>
    <form className={`admin-card admin-filters admin-overview-filters${period === "custom" ? " has-custom-dates" : ""}`} onSubmit={event => { event.preventDefault(); const next = new URLSearchParams({ from, to }); if (category) next.set("categoryId", category); if (destination) next.set("destinationId", destination); setQuery(next.toString()); setParams(next, { replace: true }); }}>
      <label className="admin-field">Time period<select value={period} onChange={event => preset(event.target.value)}><option value="day">This day</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Customize</option></select></label>
      {period === "custom" ? <><InputField id="report-from" label="Start date (MYT)" type="date" min="2000-01-01" max={to} required value={from} onChange={event => setFrom(event.target.value)} /><InputField id="report-to" label="End date (MYT)" type="date" min={from} max="2100-12-31" required value={to} onChange={event => setTo(event.target.value)} /></> : <p className="admin-period-caption">{from} — {to}<small>MYT · inclusive dates</small></p>}
      <label className="admin-field">Visitor type<select value={category} onChange={event => setCategory(event.target.value)}><option value="">All types</option>{categories.data?.map(item => <option key={item.id} value={item.id}>{item.name}{!item.active && " (inactive)"}</option>)}</select></label>
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
      <div className="admin-report-toolbar"><p role="status" className={remote.stale ? "admin-inline-error" : "muted"}>{remote.stale ? "Stale · last successful data" : "Updated"} {formatMyt(remote.data.serverUpdatedAt)} MYT</p><div className="admin-actions"><Button variant="secondary" disabled={remote.busy || exporting} onClick={remote.reload}><RefreshCw size={17} aria-hidden="true" />Refresh</Button><Button variant="secondary" disabled={remote.stale || exporting || !referencesReady} onClick={() => { void download(false); }}><Download size={17} aria-hidden="true" />Export CSV</Button><Button disabled={remote.stale || exporting || !referencesReady} busy={exporting} onClick={() => { void download(true); }}><ImageDown size={17} aria-hidden="true" />Export charts</Button></div></div>
      {message && <ToastNotice tone={tone}>{message}</ToastNotice>}
      <div className="admin-overview-metric-groups"><section><h2>Selected period</h2><div className="admin-metrics">{[["visits", "Registrations"], ["issued", "Passes issued"], ["returned", "Passes returned"], ["lost", "Passes closed lost"]].map(([key, label]) => <MetricCard key={key} report={remote.data!} metricKey={key} label={label} />)}</div></section>
      <section><h2>Current snapshot</h2><div className="admin-metrics admin-current-metrics">{[["inUse", "Unreturned passes"], ["overdue", "Overdue"], ["noDeadline", "No deadline"]].map(([key, label]) => <MetricCard key={key} report={remote.data!} metricKey={key} label={label} />)}</div></section>
      </div>
      <div ref={charts} className="admin-chart-grid" role="region" aria-label="Overview charts" tabIndex={0}><section className="admin-card"><h2>Daily registrations</h2><TrendChart report={remote.data} compact /></section><section className="admin-card"><h2>Registrations by visitor type</h2><CategoryChart report={remote.data} compact /></section><section className="admin-card"><h2>Pass issues & actual returns</h2><TrendChart report={remote.data} movement compact /></section><section className="admin-card"><h2>Pass inventory · All destinations</h2><InventoryChart report={remote.data} compact /></section></div>
      <p className="admin-report-note">{remote.data.origin} · Registrations ≠ passes. Overdue / no deadline are included in unreturned. Current counts ignore dates; inventory ignores destination. Issue / return = staff handover / receipt; lost ≠ returned.</p>
    </>}
  </>;
}
function MetricCard({ report, metricKey, label }: { report: Report; metricKey: string; label: string }) { return <div className="admin-card"><span>{label}</span><strong>{metric(report, metricKey)?.toLocaleString() ?? "Unavailable"}</strong></div>; }
