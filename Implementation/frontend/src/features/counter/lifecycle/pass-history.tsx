import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";
import { Button } from "../../../components/ui/primitives";
import { ToastNotice } from "../../../components/ui/toast";
import { preserveToastInteraction } from "../../../components/ui/dialog-feedback";
import { categoryLabels } from "../review/contracts";
import type { PassFilters } from "./contracts";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError } from "./commands";
import { usePassFeed, usePassSearch } from "./pass-feed";
import { PassTable } from "./pass-table";

type Period = "day" | "month" | "year" | "custom";
type Range = { from: string; to: string };
/** Calendar presets are MYT days, not UTC or the workstation timezone; the server owns the inclusive-day boundaries. */
function todayMyt() { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10); }
function preset(period: Exclude<Period, "custom">): Range {
  const today = todayMyt(), year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7));
  if (period === "day") return { from: today, to: today };
  if (period === "year") return { from: `${year}-01-01`, to: `${year}-12-31` };
  return { from: `${today.slice(0, 7)}-01`, to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) };
}

/** History is mounted only on explicit request; closing cancels reads and removes its visitor data from memory. */
export function PassHistoryDialog({ counterId, close, deny, restoreFocus }: { counterId: string; close: () => void; deny: () => void; restoreFocus: () => void }) {
  const [period, setPeriod] = useState<Period>("month");
  const [range, setRange] = useState<Range>(() => preset("month"));
  const [draft, setDraft] = useState<Range>(() => preset("month"));
  const [category, setCategory] = useState<PassFilters["category"]>("ALL");
  const [rangeError, setRangeError] = useState(""), [exportError, setExportError] = useState(""), [exporting, setExporting] = useState(false);
  const search = usePassSearch();
  const filters = useMemo<PassFilters>(() => ({ counterId, history: true, status: "ALL", category, search: search.search, ...range }), [counterId, category, search.search, range]);
  const feed = usePassFeed(filters, deny), scroll = useRef<HTMLDivElement>(null);
  const alive = useRef(true), exportRequest = useRef<AbortController | null>(null);
  const cancelExport = useCallback(() => exportRequest.current?.abort(), []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancelExport(); }; }, [cancelExport]);
  const unapplied = period === "custom" && (draft.from !== range.from || draft.to !== range.to);
  function selectPeriod(value: Period) {
    setPeriod(value); setRangeError(""); setExportError("");
    if (value === "custom") setDraft(range);
    else { const next = preset(value); setRange(next); setDraft(next); }
  }
  function apply() {
    if (!draft.from || !draft.to || draft.from > draft.to) { setRangeError("Choose a start date on or before the end date."); return; }
    setRangeError(""); setRange({ ...draft }); setExportError(""); scroll.current?.scrollTo({ top: 0 });
  }
  async function exportCsv() {
    if (exporting || unapplied || search.input.trim() !== search.search) return;
    const controller = new AbortController(); exportRequest.current = controller; setExporting(true); setExportError("");
    try {
      const result = await lifecycleApi.exportPasses(filters, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      // The server applies every filter across all batches and escapes spreadsheet formulas before auditing the export.
      const url = URL.createObjectURL(new Blob(["\ufeff", result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = result.filename;
      document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (alive.current && !controller.signal.aborted) { setExportError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); }
    } finally { if (alive.current && !controller.signal.aborted) setExporting(false); }
  }
  return <Dialog.Root open onOpenChange={open => { if (!open) close(); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
    <Dialog.Content className="dialog-content pass-history-dialog" onInteractOutside={preserveToastInteraction} onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(restoreFocus); }}>
      <div className="pass-dialog-header"><div><Dialog.Title>Pass history</Dialog.Title><Dialog.Description>Completed issue and return records</Dialog.Description></div>
        <Button variant="secondary" busy={exporting} disabled={unapplied || search.input.trim() !== search.search} onClick={() => void exportCsv()}><Download size={18} aria-hidden="true" />Export CSV</Button>
        <Dialog.Close asChild><Button variant="ghost" aria-label="Close pass history"><X size={20} aria-hidden="true" /></Button></Dialog.Close>
      </div>
      {exportError && <ToastNotice>{exportError}</ToastNotice>}
      <div className="pass-period-bar"><label>Time period<select value={period} disabled={exporting} onChange={event => selectPeriod(event.target.value as Period)}><option value="day">This day</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Customize</option></select></label>
        <p className="muted">{range.from} – {range.to} · Based on return date · MYT</p></div>
      {period === "custom" && <div className="pass-custom-range"><label>Start date<input type="date" disabled={exporting} value={draft.from} max={draft.to || undefined} onChange={event => setDraft(value => ({ ...value, from: event.target.value }))} /></label>
        <label>End date<input type="date" disabled={exporting} value={draft.to} min={draft.from || undefined} onChange={event => setDraft(value => ({ ...value, to: event.target.value }))} /></label><Button disabled={exporting} onClick={apply}>Apply</Button>
        {(rangeError || unapplied) && <p className="pass-range-note" role={rangeError ? "alert" : undefined}>{rangeError || "Apply the date range to update history and export."}</p>}
      </div>}
      <div className="pass-filters"><label className="pass-search">Search<input type="search" disabled={exporting} value={search.input} maxLength={100} placeholder="Visitor or pass ID" onChange={event => search.setInput(event.target.value)} /></label>
        <label>Category<select value={category} disabled={exporting} onChange={event => setCategory(event.target.value as PassFilters["category"])}><option value="ALL">All categories</option>{Object.entries(categoryLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      </div>
      <PassTable feed={feed} history scrollRef={scroll} />
      <footer className="pass-list-footer"><span>{feed.ready ? `${feed.items.length} ${feed.nextCursor ? "loaded" : "matching"} returns` : "Checking history"}</span><span className="muted">CSV includes all matching records, beyond the loaded rows.</span><Dialog.Close asChild><Button variant="secondary">Close</Button></Dialog.Close></footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
