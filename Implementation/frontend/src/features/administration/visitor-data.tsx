import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";
import { z } from "zod";
import { Button } from "../../components/ui/primitives";
import { ToastNotice } from "../../components/ui/toast";
import { preserveToastInteraction } from "../../components/ui/dialog-feedback";
import { apiClient } from "../../lib/api-client";
import { ClientError, safeError } from "../../lib/errors";
import { formatMyt } from "../../lib/time";
import { exportSchema } from "./contracts";
import { downloadBlob } from "./chart-export";

const kinds = ["REGISTRATIONS", "PASSES", "ACTIVITIES", "SUMMARY"] as const;
type Kind = typeof kinds[number];
const labels: Record<Kind, string> = { REGISTRATIONS: "Visitor registrations", PASSES: "Pass borrowing history", ACTIVITIES: "Visitor activities", SUMMARY: "Summary" };
const basis: Record<Kind, string> = {
  REGISTRATIONS: "One row per registration, filtered by registration time. Includes visitors with no pass; pass counts and No pass markers are historical/current as labelled.",
  PASSES: "One row per loan, filtered by issue time. Shows the registered borrowing contact, pass code and current return / lost status. Individual companions are not recorded separately.",
  ACTIVITIES: "One row per recorded activity, filtered by activity time. Includes No pass. Destinations are registered intentions; these records do not track physical movement.",
  SUMMARY: "One row per metric. Current snapshot metrics ignore period dates; inventory also ignores destination. Other metrics use their labelled MYT period basis.",
};
const tableSchema = z.object({ kind: z.enum(kinds), columns: z.array(z.object({ key: z.string(), label: z.string() }).strict()).max(20),
  rows: z.array(z.record(z.string(), z.string().max(12200))).max(50), more: z.boolean(), page: z.number().int().nonnegative(), serverUpdatedAt: z.iso.datetime() }).strict();
type DataTable = z.infer<typeof tableSchema>;

/** Each export is explicit, bounded and audited; the browser never automatically retries an uncertain download. */
export function CsvExport({ query, disabled = false }: { query: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false), [kind, setKind] = useState<Kind>("PASSES"), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""), [tone, setTone] = useState<"error" | "success">("success");
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function download() {
    if (lock.current || disabled) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const result = await apiClient.post(`/api/admin/reports/table-exports?${query}`, { kind, page: 0, registrationId: null }, exportSchema, { authRequired: true });
      if (alive.current) { downloadBlob(new Blob([result.csv], { type: "text/csv;charset=utf-8" }), result.filename); setTone("success"); setMessage(`${result.rowCount} rows exported. Export audit recorded.`); setOpen(false); }
    } catch (error) {
      if (alive.current) { setTone("error"); setMessage(error instanceof ClientError && error.code === "EXPORT_TOO_LARGE" ? "The complete export exceeds 10,000 rows or the size limit. Narrow the filters; no partial file was produced." : `${safeError(error)} An uncertain response may still have an export audit. Inspect before retrying.`); }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <><Dialog.Root open={open} onOpenChange={value => { if (!lock.current) setOpen(value); }}>
    <Dialog.Trigger asChild><Button variant="secondary" disabled={disabled || busy}><Download size={17} aria-hidden="true" />Export CSV</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content admin-dialog" onInteractOutside={preserveToastInteraction} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
      <div className="admin-dialog-heading"><Dialog.Title>Export CSV</Dialog.Title><Dialog.Close asChild><Button variant="ghost" disabled={busy} aria-label="Close export"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
      <Dialog.Description>Export all matching records for one report type. Visitor names are included; identification, contact and patient information are excluded.</Dialog.Description>
      <form className="admin-filter-form" onSubmit={event => { event.preventDefault(); void download(); }}>
        <label className="admin-field">Report type<select disabled={busy} value={kind} onChange={event => setKind(event.target.value as Kind)}>{kinds.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
        <p>{basis[kind]}</p><p className="muted">Uses the applied Overview date, visitor type and destination filters. Time zone: MYT.</p>
        <div className="dialog-actions"><Dialog.Close asChild><Button variant="secondary" disabled={busy}>Cancel</Button></Dialog.Close><Button type="submit" disabled={disabled} busy={busy}>Export {labels[kind]}</Button></div>
      </form>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>{message && <ToastNotice tone={tone}>{message}</ToastNotice>}</>;
}

/** Personal views load only after an explicit tab selection, rather than the Overview's aggregate polling. */
export function VisitorData({ query }: { query: string }) {
  const [kind, setKind] = useState<Kind | null>(null), [page, setPage] = useState(0), [attempt, setAttempt] = useState(0);
  const [registrationId, setRegistrationId] = useState<string | null>(null), [visitor, setVisitor] = useState("");
  const [table, setTable] = useState<DataTable | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (!kind) return;
    const controller = new AbortController(); let current = true;
    queueMicrotask(() => { if (current) { setBusy(true); setError(""); setTable(null); } });
    void apiClient.post(`/api/admin/reports/tables?${query}`, { kind, page, registrationId }, tableSchema, { authRequired: true, signal: controller.signal })
      .then(value => { if (current) { if (value.kind !== kind || value.page !== page) throw new Error("Report scope changed"); setTable(value); } })
      .catch(failure => { if (current && !controller.signal.aborted) setError(safeError(failure)); })
      .finally(() => { if (current) setBusy(false); });
    return () => { current = false; controller.abort(); };
  }, [query, kind, page, registrationId, attempt]);
  return <section className="admin-card admin-visitor-data">
    <h2>Visitor records</h2><div className="admin-actions" aria-label="Choose visitor report">{kinds.filter(value => value !== "SUMMARY").map(value => <Button key={value} variant="secondary" aria-pressed={kind === value && !registrationId} onClick={() => { setTable(null); setKind(value); setPage(0); setRegistrationId(null); }}>{labels[value]}</Button>)}</div>
    {!kind && <p>Select a view to load visitor names and records. Access is audited.</p>}
    {kind && <><p>{registrationId ? `All recorded activity for ${visitor}, across all dates. Destination / visitor type scope remains applied.` : basis[kind]}</p>
      <div className="admin-actions">{registrationId && <Button variant="secondary" onClick={() => { setTable(null); setRegistrationId(null); setKind("REGISTRATIONS"); setPage(0); }}>Back to registrations</Button>}<Button variant="secondary" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh records</Button></div></>}
    {busy && <p role="status">Loading visitor records…</p>}{error && <ToastNotice>{error}</ToastNotice>}
    {table && <><div className="admin-table-scroll" role="region" tabIndex={0} aria-label={labels[table.kind]}><table><thead><tr>{table.columns.map(column => <th key={column.key}>{column.label}</th>)}{kind === "REGISTRATIONS" && <th>Activities</th>}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={index}>{table.columns.map(column => <td key={column.key}>{display(column.key, row[column.key])}</td>)}{kind === "REGISTRATIONS" && <td><Button variant="secondary" onClick={() => { setVisitor(row.visitor); setTable(null); setKind("ACTIVITIES"); setRegistrationId(row.registrationId); setPage(0); }}>View timeline</Button></td>}</tr>)}</tbody></table></div>
      {!table.rows.length && <p>No records match this view and the applied filters.</p>}
      <footer className="admin-table-footer"><span>Page {table.page + 1} · Updated {formatMyt(table.serverUpdatedAt)} MYT</span><div className="admin-actions"><Button variant="secondary" disabled={page === 0 || busy} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="secondary" disabled={!table.more || busy} onClick={() => setPage(value => value + 1)}>Next</Button></div></footer></>}
  </section>;
}

/** Null-like values stay distinct from physical returns; synthetic activity codes receive readable labels. */
function display(key: string, value: string | undefined) {
  if (key.endsWith("At")) return value ? formatMyt(value) : key === "dueAt" ? "No deadline" : key === "returnedAt" ? "Not returned" : "—";
  if (key === "event") return ({ REGISTRATION_SUBMITTED: "Registered", REGISTRATION_VERIFIED: "Approved", REGISTRATION_REJECTED: "Rejected", REGISTRATION_NO_PASS: "No pass recorded", ISSUED: "Pass issued", RETURNED: "Pass returned", MARKED_LOST: "Pass marked lost", OVERDUE: "Pass overdue" } as Record<string,string>)[value ?? ""] ?? value;
  return value || "—";
}
