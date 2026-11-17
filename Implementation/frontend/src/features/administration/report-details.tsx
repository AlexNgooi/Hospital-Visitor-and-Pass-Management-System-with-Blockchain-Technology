import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/primitives";
import { formatMyt } from "../../lib/time";
import { reportSchema, referencesSchema, type Report } from "./contracts";
import { LoadNotice } from "./data";
import { useRemote } from "./hooks";
import { categoryLabels, series } from "./chart-data";
import { CsvExport, VisitorData } from "./visitor-data";
import { reportQuery } from "./report-query";

/** A role-gated independent page reauthorizes its own reads; no parent snapshot or private browser storage is shared. */
export function ReportDetailsPage() {
  const [params] = useSearchParams();
  const query = reportQuery(params);
  if (!query) return <div className="admin-page"><h1>Report details</h1><section className="admin-card" role="alert"><p>Use a valid MYT date range of up to 366 days and valid reference filters.</p><Link to="/admin" className="button button-secondary">Back to Overview</Link></section></div>;
  return <DetailsResults key={query} query={query} />;
}

/** Manual refresh keeps long tables stable while preserving stale/error and current authority checks. */
function DetailsResults({ query }: { query: string }) {
  const remote = useRemote(`/api/admin/reports?${query}`, reportSchema);
  const categories = useRemote("/api/admin/categories", referencesSchema), destinations = useRemote("/api/admin/destinations", referencesSchema);
  const filters = new URLSearchParams(query);
  const category = filters.get("categoryId"), destination = filters.get("destinationId");
  const categoryName = category ? categories.data?.find(item => item.id === category)?.name ?? `Visitor type ID ${category}` : "All visitor types";
  const destinationName = destination ? destinations.data?.find(item => item.id === destination)?.name ?? `Destination ID ${destination}` : "All destinations";
  return <div className="admin-page admin-report-details-page">
    <header className="admin-heading"><div><h1>Report details</h1><p>Data tables for the selected Overview filters.</p></div><div className="admin-actions"><CsvExport query={query} disabled={remote.stale} /><Link className="button button-secondary" to={`/admin?${query}`}><ArrowLeft size={17} aria-hidden="true" />Back to Overview</Link><Button variant="secondary" disabled={remote.busy} onClick={remote.reload}><RefreshCw size={17} aria-hidden="true" />Refresh</Button></div></header>
    <div className="admin-notice"><strong>{filters.get("from")} — {filters.get("to")} · MYT</strong><p>{categoryName} · {destinationName}</p><p>Registrations and passes use separate counts. Current stock ignores historical dates; inventory ignores the destination filter.</p></div>
    <LoadNotice busy={remote.busy} error={remote.error} reload={remote.reload} />
    <LoadNotice busy={categories.busy || destinations.busy} error={categories.error || destinations.error} reload={() => { categories.reload(); destinations.reload(); }} />
    {remote.data && <><p role="status" className="muted">{remote.stale ? "Stale · last successful data" : "Updated"} {formatMyt(remote.data.serverUpdatedAt)} MYT · {remote.data.origin}</p><VisitorData query={query} /><ReportData report={remote.data} /></>}
  </div>;
}

/** Numeric chart alternatives live on this dedicated page; exports still include all matches, not just previews. */
function ReportData({ report }: { report: Report }) {
  const issued = series(report, "dayIssued"), returned = series(report, "dayReturned");
  return <section className="admin-card admin-report-data" aria-label="Report data tables">
    <h2>Summary metrics</h2><div className="admin-table-scroll" role="region" aria-label="Summary metrics" tabIndex={0}><table><thead><tr><th>Metric</th><th>Group</th><th>Count</th></tr></thead><tbody>{report.metrics.filter(item => !["day", "dayIssued", "dayReturned"].includes(item.metric)).map(item => <tr key={`${item.metric}:${item.label}`}><td>{item.metric}</td><td>{categoryLabels[item.label] ?? item.label}</td><td>{item.amount}</td></tr>)}</tbody></table></div>
    <h2>Daily values (MYT)</h2><div className="admin-table-scroll admin-daily-values" role="region" aria-label="Daily chart values" tabIndex={0}><table><thead><tr><th>Date</th><th>Registrations</th><th>Passes issued</th><th>Passes returned</th></tr></thead><tbody>{series(report, "day").map((day, index) => <tr key={day.label}><td>{day.label}</td><td>{day.amount}</td><td>{issued[index]?.amount}</td><td>{returned[index]?.amount}</td></tr>)}</tbody></table></div>

  </section>;
}
