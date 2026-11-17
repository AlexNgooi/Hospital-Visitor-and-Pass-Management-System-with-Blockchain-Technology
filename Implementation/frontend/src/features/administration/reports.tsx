import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ImageDown, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-dialog";
import { preserveToastInteraction } from "../../components/ui/dialog-feedback";
import { Link, useSearchParams } from "react-router-dom";
import { Button, InputField } from "../../components/ui/primitives";
import { ToastNotice } from "../../components/ui/toast";
import { apiClient } from "../../lib/api-client";
import { ClientError, safeError } from "../../lib/errors";
import { formatMyt } from "../../lib/time";
import { referencesSchema, reportSchema, type Report, type Reference } from "./contracts";
import { CsvExport } from "./visitor-data";
import { LoadNotice } from "./data";
import { useRemote } from "./hooks";
import { CategoryChart, InventoryChart, TrendChart } from "./charts";
import { metric } from "./chart-data";
import { reportQuery } from "./report-query";
import { chartImage, downloadBlob } from "./chart-export";

const chartReceipt = z.object({ id: z.uuid(), recordedAt: z.iso.datetime() });
function todayMyt() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

/** Filtering is an explicit modal action; only applied values reach reports, exports, links and the URL. */
export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => { const today = todayMyt(); return reportQuery(params) ?? new URLSearchParams({ from: `${today.slice(0, 7)}-01`, to: today }).toString(); });
  const [filterOpen, setFilterOpen] = useState(false);
  const categories = useRemote("/api/admin/categories", referencesSchema), destinations = useRemote("/api/admin/destinations", referencesSchema);
  const applied = new URLSearchParams(query), category = applied.get("categoryId"), destination = applied.get("destinationId");
  const scope = `${category ? categories.data?.find(item => item.id === category)?.name ?? `Visitor type ID ${category}` : "All visitor types"} · ${destination ? destinations.data?.find(item => item.id === destination)?.name ?? `Destination ID ${destination}` : "All destinations"}`;
  const referencesReady = Boolean(categories.data && destinations.data && !categories.busy && !destinations.busy && !categories.error && !destinations.error);
  return <div className="admin-page admin-overview">
    <Dialog.Root open={filterOpen} onOpenChange={setFilterOpen}>
      <header className="admin-heading"><div><h1>Overview</h1><p>Visitor activity and pass performance.</p></div><div className="admin-actions admin-overview-heading-actions">
        <Dialog.Trigger asChild><Button variant="secondary"><SlidersHorizontal size={17} aria-hidden="true" />Filter</Button></Dialog.Trigger>
        <Link className="button button-secondary admin-details-button" to={`/admin/report-details?${query}`} target="_blank" rel="noopener noreferrer" aria-label="View report details (opens in a new tab)">View details<ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div></header>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content admin-dialog admin-filter-dialog" onInteractOutside={preserveToastInteraction} onOpenAutoFocus={event => { const input = document.getElementById("overview-filter-period"); if (input) { event.preventDefault(); input.focus(); } }}>
        <div className="admin-dialog-heading"><Dialog.Title>Overview filters</Dialog.Title><Dialog.Close asChild><Button variant="ghost" aria-label="Close filters"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
        <Dialog.Description>Choose a time period, visitor type and destination. Apply to update the overview.</Dialog.Description>
        <LoadNotice busy={categories.busy || destinations.busy} error={categories.error || destinations.error} reload={() => { categories.reload(); destinations.reload(); }} />
        <ReportFilterForm key={query} query={query} categories={categories.data ?? []} destinations={destinations.data ?? []} disabled={!referencesReady} onApply={next => { setQuery(next); setParams(new URLSearchParams(next), { replace: true }); setFilterOpen(false); }} />
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    <LoadNotice busy={categories.busy || destinations.busy} error={categories.error || destinations.error} reload={() => { categories.reload(); destinations.reload(); }} />
    <ReportResults key={query} query={query} scope={scope} referencesReady={referencesReady} />
  </div>;
}

/** The dialog unmounts on dismissal, discarding drafts; every opening starts from the applied query. */
function ReportFilterForm({ query, categories, destinations, disabled, onApply }: { query: string; categories: Reference[]; destinations: Reference[]; disabled: boolean; onApply: (query: string) => void }) {
  const applied = new URLSearchParams(query);
  const [from, setFrom] = useState(applied.get("from")!), [to, setTo] = useState(applied.get("to")!);
  const [category, setCategory] = useState(applied.get("categoryId") ?? ""), [destination, setDestination] = useState(applied.get("destinationId") ?? "");
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(() => {
    const today = todayMyt();
    if (applied.get("to") !== today) return "custom";
    if (applied.get("from") === today) return "day";
    if (applied.get("from") === `${today.slice(0, 7)}-01`) return "month";
    if (applied.get("from") === `${today.slice(0, 4)}-01-01`) return "year";
    return "custom";
  });
  function preset(value: string) {
    const today = todayMyt(); setPeriod(value); setError("");
    if (value !== "custom") { setFrom(value === "day" ? today : value === "year" ? `${today.slice(0, 4)}-01-01` : `${today.slice(0, 7)}-01`); setTo(today); }
  }
  return <form className="admin-filter-form" onSubmit={event => {
    event.preventDefault(); if (disabled) return;
    const next = new URLSearchParams({ from, to }); if (category) next.set("categoryId", category); if (destination) next.set("destinationId", destination);
    const valid = reportQuery(next);
    if (!valid) { setError("Choose valid MYT dates with a range of up to 366 days."); return; }
    onApply(valid);
  }}>
    <label className="admin-field" htmlFor="overview-filter-period">Time period<select id="overview-filter-period" value={period} onChange={event => preset(event.target.value)}><option value="day">This day</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Customize</option></select></label>
    {period === "custom" ? <div className="admin-filter-dates"><InputField id="report-from" label="Start date (MYT)" type="date" min="2000-01-01" max={to} required value={from} onChange={event => { setFrom(event.target.value); setError(""); }} /><InputField id="report-to" label="End date (MYT)" type="date" min={from} max="2100-12-31" required value={to} onChange={event => { setTo(event.target.value); setError(""); }} /></div> : <p className="admin-filter-period">{from} — {to}<small>MYT · inclusive dates</small></p>}
    <label className="admin-field">Visitor type<select value={category} disabled={disabled} onChange={event => setCategory(event.target.value)}><option value="">All visitor types</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}{!item.active && " (inactive)"}</option>)}</select></label>
    <label className="admin-field">Destination<select value={destination} disabled={disabled} onChange={event => setDestination(event.target.value)}><option value="">All destinations</option>{destinations.map(item => <option key={item.id} value={item.id}>{item.name}{!item.active && " (inactive)"}</option>)}</select></label>
    {error && <p className="admin-inline-error" role="alert">{error}</p>}
    <div className="dialog-actions"><Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close><Button type="submit" disabled={disabled}>Apply filters</Button></div>
  </form>;
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
      }
      if (alive.current) { setTone("success"); setMessage("Chart image exported. Export audit recorded."); }
    } catch (error) { if (alive.current) { setTone("error"); setMessage(error instanceof ClientError && error.code === "EXPORT_TOO_LARGE" ? "The complete export exceeds 10,000 rows or the response size limit. Narrow the range; no partial CSV was produced." : `${safeError(error)} An uncertain download may still have an export audit. No automatic retry was sent.`); } }
    finally { lock.current = false; if (alive.current) setExporting(false); }
  }
  return <><LoadNotice busy={remote.busy && !remote.data} error={remote.error} reload={remote.reload} />
    {remote.data && <>
      <div className="admin-report-toolbar"><p role="status" className={remote.stale ? "admin-inline-error" : "muted"}><span className="admin-filter-summary">{remote.data.from} — {remote.data.to} · {scope}</span>{remote.stale ? "Stale · last successful data" : "Updated"} {formatMyt(remote.data.serverUpdatedAt)} MYT</p><div className="admin-actions"><Button variant="secondary" disabled={remote.busy || exporting} onClick={remote.reload}><RefreshCw size={17} aria-hidden="true" />Refresh</Button><CsvExport query={query} disabled={remote.stale || exporting || !referencesReady} /><Button disabled={remote.stale || exporting || !referencesReady} busy={exporting} onClick={() => { void download(true); }}><ImageDown size={17} aria-hidden="true" />Export charts</Button></div></div>
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
