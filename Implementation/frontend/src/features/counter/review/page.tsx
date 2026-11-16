import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, RefreshCw, Search, X } from "lucide-react";
import { useAuth } from "../../../app/auth-context";
import { useCounterScope } from "../../../app/counter-context";
import { Button, StatusPanel } from "../../../components/ui/primitives";
import { preserveToastInteraction } from "../../../components/ui/dialog-feedback";
import { ClientError, safeError } from "../../../lib/errors";
import { formatMyt } from "../../../lib/time";
import type { SessionUser } from "../../../lib/contracts";
import { useLifecycleCommands, lifecycleAccessLost } from "../lifecycle/commands";
import { ManualIssue } from "../lifecycle/manual-issue";
import { reviewPort } from "./client";
import { categoryLabels, reasonLabels, statusLabels, type Category, type Detail, type Queue, type Reason, type ReviewFields, type ReviewPort, type Status } from "./contracts";
import "./review.css";

/** Identity and counter changes unmount all operational state; server authority remains decisive. */
export function RegistrationReview({ port = reviewPort, embedded = false }: { port?: ReviewPort; embedded?: boolean }) {
  const { state, refresh } = useAuth();
  const counter = useCounterScope();
  if (state.kind !== "authenticated" || state.user.role !== "COUNTER_STAFF") return <StatusPanel kind="error" title="Counter Staff access required">Sign in with an authorized staff account.</StatusPanel>;
  if (!counter || !state.user.counterIds.includes(counter)) return <StatusPanel kind="empty" title="No counter access">Ask the administrator to assign counter access.</StatusPanel>;
  return <ReviewWorkspace key={`${state.user.id}:${counter}`} authority={state.user} counterId={counter} port={port} embedded={embedded} recheckSession={refresh} />;
}

/** Poll bounded queue metadata; audited full fields are fetched when the staff member opens a modal. */
function ReviewWorkspace({ authority, counterId, port, embedded, recheckSession }: {
  authority: SessionUser; counterId: string; port: ReviewPort; embedded: boolean; recheckSession: () => void;
}) {
  const [category, setCategory] = useState<Category | "ALL">("ALL"), [status, setStatus] = useState<Status | "ALL">("SUBMITTED");
  const [page, setPage] = useState(0), [search, setSearch] = useState("");
  const [queue, setQueue] = useState<Queue | null>(null), [queueBusy, setQueueBusy] = useState(true), [queueError, setQueueError] = useState("");
  const [selected, setSelected] = useState<string | null>(null), [detail, setDetail] = useState<Detail | null>(null);
  const [fields, setFields] = useState<ReviewFields | null>(null), [detailBusy, setDetailBusy] = useState(false), [detailError, setDetailError] = useState("");
  const [denied, setDenied] = useState(false), [rejectOpen, setRejectOpen] = useState(false), [reason, setReason] = useState<Reason | "">("");
  const alive = useRef(false), accessLost = useRef(false), queueGeneration = useRef(0), detailGeneration = useRef(0);
  const queueAbort = useRef<AbortController | null>(null), detailAbort = useRef<AbortController | null>(null);
  const queueHeading = useRef<HTMLHeadingElement>(null), returnFocus = useRef<HTMLElement | null>(null);
  const clearFields = useCallback(() => { detailGeneration.current++; detailAbort.current?.abort(); setFields(null); setDetailBusy(false); }, []);
  const deny = useCallback(() => {
    accessLost.current = true; clearFields(); setDenied(true); setQueue(null); setDetail(null); setSelected(null);
  }, [clearFields]);
  const commands = useLifecycleCommands(deny, clearFields);
  const locked = commands.locked;

  const loadQueue = useCallback(async () => {
    if (accessLost.current) return;
    const seq = ++queueGeneration.current; queueAbort.current?.abort();
    const controller = new AbortController(); queueAbort.current = controller; setQueueBusy(true);
    try {
      const value = await port.list({ counterId, category, status, page, pageSize: 10 }, controller.signal);
      if (!alive.current || seq !== queueGeneration.current) return;
      if (value.page !== page || value.pageSize !== 10 || value.items.some(item => item.counterId !== counterId)) throw new ClientError("invalid-response");
      setQueue(value); setQueueError("");
    } catch (error) {
      if (!alive.current || seq !== queueGeneration.current || controller.signal.aborted) return;
      setQueueError(safeError(error)); clearFields(); if (lifecycleAccessLost(error)) deny();
    } finally { if (alive.current && seq === queueGeneration.current) setQueueBusy(false); }
  }, [counterId, category, status, page, port, deny, clearFields]);

  const loadDetail = useCallback(async (id: string) => {
    if (accessLost.current) return;
    clearFields(); const seq = detailGeneration.current;
    const controller = new AbortController(); detailAbort.current = controller;
    setDetailBusy(true); setDetail(null); setDetailError(""); setRejectOpen(false); setReason("");
    try {
      const value = await port.detail(id, controller.signal);
      if (!alive.current || seq !== detailGeneration.current) return;
      if (value.id !== id || value.counterId !== counterId) throw new ClientError("invalid-response");
      setDetail(value);
      if (!port.reviewFields) throw new Error("Staff comparison is unavailable");
      const comparison = await port.reviewFields(id, value.version, controller.signal);
      if (!alive.current || seq !== detailGeneration.current) return;
      if (comparison.id !== id || comparison.version !== value.version) throw new ClientError("invalid-response");
      setFields(comparison);
    } catch (error) {
      if (!alive.current || seq !== detailGeneration.current || controller.signal.aborted) return;
      setFields(null); setDetailError(safeError(error)); if (lifecycleAccessLost(error)) deny();
    } finally { if (alive.current && seq === detailGeneration.current) setDetailBusy(false); }
  }, [counterId, port, clearFields, deny]);

  /** These refs hold the latest requests, rather than DOM nodes captured by an effect. */
  const cancelReads = useCallback(() => {
    queueGeneration.current++; queueAbort.current?.abort();
    detailGeneration.current++; detailAbort.current?.abort();
  }, []);
  useEffect(() => {
    alive.current = true; let current = true;
    queueMicrotask(() => { if (current) void loadQueue(); });
    const refresh = () => { if (document.visibilityState === "visible" && navigator.onLine) void loadQueue(); };
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh); window.addEventListener("online", refresh);
    return () => {
      current = false; alive.current = false; window.clearInterval(timer); cancelReads();
      document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh);
    };
  }, [loadQueue, cancelReads]);
  useEffect(() => {
    // A refreshed authorization snapshot clears PII and fences late comparison responses.
    let current = true; queueMicrotask(() => { if (current) clearFields(); });
    return () => { current = false; };
  }, [authority, clearFields]);
  const observed = queue?.items.find(item => item.id === selected);
  const stale = Boolean(detail && queue && ((observed && (observed.version !== detail.version || observed.status !== detail.status)) || (!observed && detail.status === "SUBMITTED")));
  useEffect(() => {
    let current = true; if (stale) queueMicrotask(() => { if (current) clearFields(); });
    return () => { current = false; };
  }, [stale, clearFields]);
  const editable = !locked && !stale && !queueError && !detailBusy;
  const comparisonReady = fields && detail && fields.id === detail.id && fields.version === detail.version && !stale && !queueError;

  function clearSelection() {
    clearFields(); setSelected(null); setDetail(null); setDetailBusy(false); setDetailError(""); setRejectOpen(false); setReason("");
  }
  function done() { clearSelection(); void loadQueue(); }
  function select(id: string) {
    if (locked) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    clearSelection(); setSelected(id); void loadDetail(id);
  }
  function reject() {
    if (!detail || !editable || !reason) return;
    const id = detail.id, expectedVersion = detail.version;
    commands.submit(port.reject(id, { expectedVersion, reasonCode: reason }), "Registration rejection", result => {
      if (result.id !== id || result.status !== "REJECTED" || result.version !== expectedVersion + 1) throw new Error("Unexpected rejection receipt");
      done();
    });
  }
  const visible = queue?.items.filter(item => `${item.publicReference} ${item.visitorDisplayName ?? item.maskedVisitorName} ${item.destinationLabel}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) ?? [];
  const cancel = <Button variant="secondary" disabled={locked} onClick={clearSelection}>Cancel</Button>;
  const rejection = <Button variant="ghost" className="review-reject-action" disabled={!editable || detail?.status !== "SUBMITTED"} onClick={() => setRejectOpen(true)}>Reject registration</Button>;
  if (denied) return <StatusPanel kind="error" title="Current access must be rechecked" action={<><Button onClick={recheckSession}>Refresh staff session</Button>{commands.recovery}</>}>Cached details have been cleared.{commands.notice}</StatusPanel>;
  return <section className={`review-page${embedded ? " review-embedded" : ""}`} aria-label="Registration review workspace">
    {!embedded && <header className="review-header"><div><h1>Registration review</h1><p className="muted">Select a registration to review and issue a pass.</p></div></header>}
    {commands.notice}
    <section className="review-queue" aria-labelledby="review-queue-title">
      <div className="review-section-heading"><div className="review-queue-heading"><h2 id="review-queue-title" ref={queueHeading} tabIndex={-1}>Registration queue</h2>{queue && <span className="review-count">{queue.total} {status === "SUBMITTED" ? "awaiting review" : "registrations"}</span>}</div><Button variant="ghost" aria-label="Refresh queue" busy={queueBusy} onClick={() => void loadQueue()}><RefreshCw size={18} aria-hidden="true" />Refresh</Button></div>
      <div className="review-filters"><label className="review-search"><span>Search this page</span><span className="review-search-input"><Search size={18} aria-hidden="true" /><input type="search" placeholder="Visitor or registration ID" value={search} disabled={locked} onChange={event => setSearch(event.target.value)} /></span></label>
        <label>Category<select value={category} disabled={locked} onChange={event => { clearSelection(); setCategory(event.target.value as Category | "ALL"); setPage(0); setSearch(""); }}><option value="ALL">All categories</option>{Object.entries(categoryLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label>Status<select value={status} disabled={locked} onChange={event => { clearSelection(); setStatus(event.target.value as Status | "ALL"); setPage(0); setSearch(""); }}><option value="ALL">All statuses</option>{Object.entries(statusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      </div>
      {queueError && <p className="review-notice" role="alert">{queueError} Review actions are paused until a fresh read succeeds.</p>}
      {!queue ? <StatusPanel kind={queueBusy ? "loading" : "empty"} title={queueBusy ? "Loading registrations" : "Queue unavailable"}>Use Refresh to retry.</StatusPanel> : <>
        <div className="review-table-wrap" role="region" aria-label="Scrollable registration queue" tabIndex={0}><table className="review-table"><thead><tr><th>Visitor / registration</th><th>Category</th><th>Destination</th><th>Status</th><th>Submitted (MYT)</th><th><span className="feedback-sr-only">Action</span></th></tr></thead><tbody>
          {visible.map(item => <tr key={item.id}><td><strong className="review-visitor-name">{visitorName(item.visitorDisplayName ?? item.maskedVisitorName)}</strong><small>{item.publicReference}</small></td><td>{categoryLabels[item.categoryCode]}</td><td>{item.destinationLabel}</td><td><span className={`review-status review-status-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span></td><td>{formatMyt(item.submittedAt)}</td><td><Button variant="secondary" disabled={locked} aria-label={`${item.status === "SUBMITTED" ? "Review and issue" : "Open"} ${item.publicReference}`} onClick={() => select(item.id)}>{item.status === "SUBMITTED" ? "Review & issue" : "Open"}<ArrowRight size={16} aria-hidden="true" /></Button></td></tr>)}
          {visible.length === 0 && <tr><td colSpan={6} className="review-empty">{queue.items.length ? "No registrations match the search on this page." : "No registrations in this view."}</td></tr>}
        </tbody></table></div>
        <footer className="review-pagination"><span>{queue.total} registrations</span><div className="review-actions"><Button variant="secondary" disabled={locked || queueBusy || page === 0} onClick={() => { clearSelection(); setPage(page - 1); }}>Previous</Button><span>Page {page + 1} of {Math.max(1, Math.ceil(queue.total / 10))}</span><Button variant="secondary" disabled={locked || queueBusy || (page + 1) * 10 >= queue.total} onClick={() => { clearSelection(); setPage(page + 1); }}>Next</Button></div><small className="muted">Updated {formatMyt(queue.serverNow)} MYT · Auto-refresh every 5s</small></footer>
      </>}
    </section>
    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open && !locked) clearSelection(); }}>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content review-dialog" onInteractOutside={preserveToastInteraction}
        onEscapeKeyDown={event => { if (locked) event.preventDefault(); }} onPointerDownOutside={event => { if (locked) event.preventDefault(); }}
        onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => { if (returnFocus.current?.isConnected) returnFocus.current.focus(); queueHeading.current?.focus(); }); }}>
        <header className="review-dialog-heading"><div><Dialog.Title>{rejectOpen ? "Reject registration" : "Review & issue pass"}</Dialog.Title><Dialog.Description>{detail ? `${detail.publicReference} · ${categoryLabels[detail.categoryCode]}` : "Loading the selected registration"}</Dialog.Description></div><Button variant="ghost" disabled={locked} onClick={clearSelection} aria-label="Close registration"><X size={22} aria-hidden="true" /></Button></header>
        <div className="review-dialog-body">
          {commands.recovery && <div className="review-notice" role="alert">The result is unconfirmed. Keep this dialog open and retry only the original command.{commands.recovery}</div>}
          {detailBusy && <p role="status">Loading registration details…</p>}
          {detailError && <p className="review-notice" role="alert">{detailError}</p>}
          {(stale || queueError) && <p className="review-notice" role="alert">The queue or registration changed. Refresh details before continuing.</p>}
          {!detailBusy && selected && <Button variant="ghost" disabled={locked} onClick={() => { void loadDetail(selected); void loadQueue(); }}>Refresh details</Button>}
          {detail && <>
            <section className="registration-facts"><div className="review-section-heading"><h2>Registration details</h2><span className="badge">{detail.source === "SYNTHETIC" ? "Demo data" : "Real data"}</span></div>
              {comparisonReady && <dl className="review-facts">{fields.fields.map(field => <div key={field.name}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>}
              <dl className="review-facts"><div><dt>Submitted</dt><dd>{formatMyt(detail.submittedAt)} MYT</dd></div><div><dt>Destination</dt><dd>{detail.destinationLabel}</dd></div><div><dt>Status</dt><dd>{statusLabels[detail.status]}</dd></div></dl>
              {comparisonReady && fields.terms && <p className="muted">Pass terms accepted · {formatMyt(fields.terms.capturedAt)} MYT</p>}
              {detail.categoryCode === "PENJAGA" && <p className="muted">MRN lookup: {detail.mrnMode === "mock" ? "Mock" : "Manual"} · {feedbackLabel(detail.mrnFeedback)}. Compare the MRN, patient and ward details before approval.</p>}
              {detail.review && <p className="muted">Reviewed by staff {detail.review.actorId} · {formatMyt(detail.review.reviewedAt)} MYT{detail.review.reasonCode ? ` · ${reasonLabels[detail.review.reasonCode]}` : ""}</p>}
            </section>
            {rejectOpen ? <section className="review-rejection"><label className="review-reason">Rejection reason<select value={reason} disabled={locked} onChange={event => setReason(event.target.value as Reason | "")}><option value="">Choose a reason</option>{Object.entries(reasonLabels).filter(([code]) => detail.categoryCode === "PENJAGA" || code !== "MRN_WARD_NOT_CONFIRMED").map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><div className="review-modal-footer"><Button variant="secondary" disabled={locked} onClick={() => setRejectOpen(false)}>Back</Button><Button disabled={!reason || !editable} busy={commands.pending} onClick={reject}>Confirm rejection</Button></div></section>
              : (detail.status === "SUBMITTED" || detail.status === "VERIFIED") && detail.source === "SYNTHETIC" ? <ManualIssue key={`${detail.id}:${detail.version}`} registrationId={detail.id} commands={commands} disabled={!editable || !comparisonReady} reviewVersion={detail.status === "SUBMITTED" ? detail.version : undefined} onDone={done} onAccessLost={deny} footer={<>{detail.status === "SUBMITTED" && rejection}{cancel}</>} /> : <>
                {detail.source !== "SYNTHETIC" && <p className="review-notice">Real hospital verification is not enabled for this demonstration.</p>}
                <div className="review-modal-footer">{detail.status === "SUBMITTED" && rejection}{cancel}</div>
              </>}
          </>}
        </div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </section>;
}
/** Count Unicode characters so the twelve-character preview never splits a surrogate pair. */
function visitorName(value: string): string {
  const characters = Array.from(value);
  return characters.length <= 12 ? value : `${characters.slice(0, 12).join("")}…`;
}
/** Fixed local copy prevents provider errors from appearing in the registration record. */
function feedbackLabel(value: Detail["mrnFeedback"]): string {
  return ({ NOT_CHECKED: "Not checked", MATCH: "Record found in test data", NO_MATCH: "No match in test data", TIMEOUT: "Timed out", UNAVAILABLE: "Unavailable" } as const)[value ?? "NOT_CHECKED"];
}
