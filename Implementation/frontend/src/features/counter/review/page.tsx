import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../app/auth-context";
import { useCounterScope } from "../../../app/counter-context";
import { Button, StatusPanel } from "../../../components/ui/primitives";
import type { Command } from "../../../lib/api-client";
import { ClientError, safeError } from "../../../lib/errors";
import { formatMyt } from "../../../lib/time";
import { reviewPort } from "./client";
import { categoryLabels, reasonLabels, statusLabels, type Category, type Detail, type Queue, type Reason, type ReviewPort, type ReviewResult, type Status, type Verify } from "./contracts";
import "./review.css";

type Mutation =
  | { kind: "idle" }
  | { kind: "pending" | "unknown"; command: Command<ReviewResult>; id: string; reference: string; version: number; action: "verify" | "reject" }
  | { kind: "success"; result: ReviewResult };
const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
const lostAccess = (error: unknown) => error instanceof ClientError && (error.status === 401 || error.status === 404 || (error.status === 403 && error.code !== "CSRF_INVALID"));
const unresolved = (mutation: Mutation) => mutation.kind === "pending" || mutation.kind === "unknown";

/** Shell identity and counter selection fence local state; neither is a substitute for server authorization. */
export function RegistrationReview({ port = reviewPort }: { port?: ReviewPort }) {
  const { state, refresh } = useAuth();
  const counter = useCounterScope();
  if (state.kind !== "authenticated" || state.user.role !== "COUNTER_STAFF") {
    return <StatusPanel kind="error" title="Counter Staff access required">Sign in with an authorized staff account.</StatusPanel>;
  }
  if (!counter || !state.user.counterIds.includes(counter)) {
    return <StatusPanel kind="empty" title="No counter access">Ask the administrator to assign counter access.</StatusPanel>;
  }
  return <ReviewWorkspace key={`${state.user.id}:${counter}`} counterId={counter} port={port} recheckSession={refresh} />;
}

/** Current reads are fenced by request generation; writes are explicit and retain one immutable command handle. */
function ReviewWorkspace({ counterId, port, recheckSession }: { counterId: string; port: ReviewPort; recheckSession: () => void }) {
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [status, setStatus] = useState<Status | "ALL">("SUBMITTED");
  const [page, setPage] = useState(0);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [queueBusy, setQueueBusy] = useState(true);
  const [queueError, setQueueError] = useState<unknown>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<unknown>(null);
  const [identity, setIdentity] = useState(false);
  const [mrn, setMrn] = useState(false);
  const [ward, setWard] = useState(false);
  const [mutation, setMutation] = useState<Mutation>({ kind: "idle" });
  const [commandError, setCommandError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [accessLost, setAccessLost] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [reasonError, setReasonError] = useState(false);
  const alive = useRef(false);
  const queueGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const queueAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const writeLock = useRef(false);
  const accessLostRef = useRef(false);
  const detailHeading = useRef<HTMLHeadingElement | null>(null);
  const rejectionSummary = useRef<HTMLParagraphElement | null>(null);
  const commandNoticeRef = useRef<HTMLDivElement | null>(null);

  /** Authorization failures remove stale operational data instead of leaving a previous counter's view visible. */
  const deny = useCallback(() => {
    accessLostRef.current = true;
    setAccessLost(true); setQueue(null); setDetail(null); setSelected(null);
    detailGeneration.current++; detailAbort.current?.abort();
  }, []);
  const resetChecks = useCallback(() => {
    setIdentity(false); setMrn(false); setWard(false); setConflict(false); setReason(""); setReasonError(false);
  }, []);
  /** These refs track the latest network requests, not DOM nodes captured by an effect. */
  const cancelReads = useCallback(() => {
    queueGeneration.current++; queueAbort.current?.abort();
    detailGeneration.current++; detailAbort.current?.abort();
  }, []);

  /** Queue refresh never substitutes a new version into an in-progress review or replays a write. */
  const loadQueue = useCallback(async () => {
    if (accessLostRef.current) return;
    const sequence = ++queueGeneration.current;
    queueAbort.current?.abort(); const controller = new AbortController(); queueAbort.current = controller;
    setQueueBusy(true);
    try {
      const value = await port.list({ counterId, category, status, page, pageSize: 10 }, controller.signal);
      if (!alive.current || sequence !== queueGeneration.current) return;
      if (value.page !== page || value.pageSize !== 10 || value.items.some((item) => item.counterId !== counterId)) throw new ClientError("invalid-response");
      setQueue(value); setQueueError(null);
    } catch (error) {
      if (!alive.current || sequence !== queueGeneration.current || isAbort(error)) return;
      setQueueError(error); if (lostAccess(error)) deny();
    } finally { if (alive.current && sequence === queueGeneration.current) setQueueBusy(false); }
  }, [counterId, category, status, page, port, deny]);

  /** Detail is explicitly re-read after a conflict; confirmations are never silently carried to a newer version. */
  const loadDetail = useCallback(async (id: string, focus = false) => {
    if (accessLostRef.current) return;
    const sequence = ++detailGeneration.current;
    detailAbort.current?.abort(); const controller = new AbortController(); detailAbort.current = controller;
    setDetailBusy(true); setDetail(null); setDetailError(null); setRejectOpen(false); resetChecks();
    try {
      const value = await port.detail(id, controller.signal);
      if (!alive.current || sequence !== detailGeneration.current) return;
      if (value.id !== id || value.counterId !== counterId) throw new ClientError("invalid-response");
      setDetail(value);
      if (focus) requestAnimationFrame(() => {
        if (alive.current && sequence === detailGeneration.current) {
          detailHeading.current?.focus({ preventScroll: true });
          // Selecting a row brings the review panel into view rather than leaving its primary actions below a long queue.
          detailHeading.current?.scrollIntoView?.({ block: "start" });
        }
      });
    } catch (error) {
      if (!alive.current || sequence !== detailGeneration.current || isAbort(error)) return;
      setDetailError(error); if (lostAccess(error)) deny();
    } finally { if (alive.current && sequence === detailGeneration.current) setDetailBusy(false); }
  }, [counterId, port, resetChecks, deny]);

  useEffect(() => {
    alive.current = true;
    let active = true;
    queueMicrotask(() => { if (active) void loadQueue(); });
    // Hidden pages pause polling; visibility recovery is a GET, never a write retry.
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) void loadQueue(); }, 5000);
    const refresh = () => { if (document.visibilityState === "visible" && navigator.onLine) void loadQueue(); };
    document.addEventListener("visibilitychange", refresh); window.addEventListener("online", refresh);
    return () => {
      active = false; alive.current = false; window.clearInterval(timer); cancelReads();
      document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh);
    };
  }, [loadQueue, cancelReads]);

  /** A same-page queue change invalidates approval readiness but does not replace the selected evidence snapshot. */
  const observed = queue?.items.find((item) => item.id === selected);
  const staleDetail = Boolean(detail && queue && ((observed && (observed.version !== detail.version || observed.status !== detail.status))
    || (!observed && detail.status === "SUBMITTED")));
  const locked = unresolved(mutation);
  const editable = Boolean(detail && detail.status === "SUBMITTED" && !detailBusy && !queueError && !staleDetail && !conflict && !locked);
  const penjaga = detail?.categoryCode === "PENJAGA";
  const approveReady = editable && detail?.source === "SYNTHETIC" && identity && (!penjaga || (mrn && ward)) && (detail?.version ?? 0) < Number.MAX_SAFE_INTEGER;

  /** Reads may recover an unknown command's current state, but only the original handle can confirm its own result. */
  async function run(pending: Extract<Mutation, { kind: "pending" | "unknown" }>) {
    if (writeLock.current) return;
    writeLock.current = true; setMutation({ ...pending, kind: "pending" }); setCommandError(null);
    try {
      const result = await pending.command.execute();
      if (!alive.current) return;
      if (result.id !== pending.id || result.reference !== pending.reference || result.version !== pending.version + 1
          || result.status !== (pending.action === "verify" ? "VERIFIED" : "REJECTED")) throw new ClientError("invalid-response");
      setMutation({ kind: "success", result }); setRejectOpen(false); resetChecks();
      void loadQueue(); void loadDetail(pending.id);
    } catch (error) {
      if (!alive.current) return;
      if (!(error instanceof ClientError) || error.kind !== "api" || (error.status ?? 0) >= 500) {
        // Transport/proxy/5xx failures may follow a committed write. Keep the exact key/body/version in memory.
        setMutation({ ...pending, kind: "unknown" }); setCommandError("The review result is unconfirmed. Check its current status or retry the original command.");
      } else if (pending.kind === "unknown") {
        // A retry's 4xx proves only that attempt failed, not that the original UNKNOWN write never committed.
        // Keep the same actor/counter-scoped handle and block new commands; scope changes still unmount this workspace.
        setMutation({ ...pending, kind: "unknown" });
        setCommandError("The original review is still unconfirmed. Check its current status or retry the original command.");
        if (lostAccess(error)) deny();
      } else {
        setMutation({ kind: "idle" });
        if (error.status === 409) {
          setConflict(true); setCommandError("This review conflicts with a saved command or a newer registration. Refresh the detail and review it again.");
          setIdentity(false); setMrn(false); setWard(false); setRejectOpen(false);
        } else { setCommandError(safeError(error)); }
        if (lostAccess(error)) deny();
      }
      requestAnimationFrame(() => {
        if (alive.current) {
          commandNoticeRef.current?.focus({ preventScroll: true });
          commandNoticeRef.current?.scrollIntoView?.({ block: "start" });
        }
      });
    } finally { writeLock.current = false; }
  }

  /** Construct confirmations only for the displayed category; M03/server still revalidates the authoritative category. */
  function approve() {
    if (!approveReady || !detail || writeLock.current) return;
    const input: Verify = { expectedVersion: detail.version, identityConfirmed: true,
      ...(penjaga ? { mrnConfirmed: true as const, wardConfirmed: true as const } : {}),
      manualEvidence: { methodCode: "SYNTHETIC_RECORD_COMPARISON", basisCodes: penjaga
        ? ["IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED"] : ["IDENTITY_MATCH_CONFIRMED"] } };
    try { void run({ kind: "pending", command: port.verify(detail.id, input), id: detail.id, reference: detail.publicReference, version: detail.version, action: "verify" }); }
    catch { setCommandError("Check the review confirmations before approving."); }
  }
  function reject() {
    if (!editable || !detail || writeLock.current) return;
    if (!reason) { setReasonError(true); requestAnimationFrame(() => rejectionSummary.current?.focus()); return; }
    try { void run({ kind: "pending", command: port.reject(detail.id, { expectedVersion: detail.version, reasonCode: reason }), id: detail.id, reference: detail.publicReference, version: detail.version, action: "reject" }); }
    catch { setCommandError("Select a valid rejection reason."); }
  }

  /** Filter changes fence pending detail reads and clear evidence instead of applying it to another row. */
  function clearSelection() {
    detailGeneration.current++; detailAbort.current?.abort(); setSelected(null); setDetail(null); setDetailBusy(false);
    setDetailError(null); setCommandError(null); setMutation({ kind: "idle" }); resetChecks();
  }
  function select(id: string) {
    if (locked) return; clearSelection(); setSelected(id); void loadDetail(id, true);
  }
  const unknownActions = mutation.kind === "unknown" ? <div className="review-actions">
    <Button variant="secondary" onClick={() => void loadDetail(mutation.id)}>Check current status</Button>
    <Button onClick={() => void run(mutation)}>Retry original command</Button>
  </div> : null;
  // A generic detail refresh may clear a prior error; it must never erase recovery for an unresolved command.
  const commandNotice = commandError ?? (mutation.kind === "unknown" ? "The review result is unconfirmed. Check its current status or retry the original command." : null);

  if (accessLost) return <StatusPanel kind="error" title="Review access is no longer available" action={<Button onClick={recheckSession}>Refresh staff session</Button>}>Refresh your session from the staff workspace. No cached registration details remain visible.</StatusPanel>;
  return <section className="review-page" aria-label="Registration review workspace">
    <header className="review-header"><div><span className="eyebrow">COUNTER REVIEW</span><h1>Registration review</h1>
      <p className="muted">Verify the visitor, then approve or reject the registration.</p></div>
      <span className="review-capability"><ShieldCheck size={18} aria-hidden="true" />Local audit · Messages not enabled</span></header>
    <p className="review-boundary">Approval does not issue a card, create a Pass ID, set a return deadline, or send a message.</p>
    {mutation.kind === "success" && <div className="review-notice review-success" role="status"><CheckCircle2 size={20} aria-hidden="true" />
      <span>{statusLabels[mutation.result.status]} registration {mutation.result.reference}. No card or message was created.</span></div>}
    {commandNotice && !rejectOpen && <div ref={commandNoticeRef} tabIndex={-1} className="review-notice review-warning" role="alert"><p>{commandNotice}</p>{unknownActions}</div>}
    <div className="review-grid">
      <section className="review-queue" aria-labelledby="review-queue-title">
        <div className="review-section-heading"><h2 id="review-queue-title">Registration queue</h2><Button variant="ghost" aria-label="Refresh queue" onClick={() => void loadQueue()} busy={queueBusy}><RefreshCw size={18} aria-hidden="true" /></Button></div>
        <div className="review-filters"><label htmlFor="review-category">Category<select id="review-category" value={category} disabled={locked} onChange={(event) => { clearSelection(); setCategory(event.target.value as Category | "ALL"); setPage(0); }}>
          <option value="ALL">All categories</option>{Object.entries(categoryLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label htmlFor="review-status">Status<select id="review-status" value={status} disabled={locked} onChange={(event) => { clearSelection(); setStatus(event.target.value as Status | "ALL"); setPage(0); }}>
            <option value="ALL">All statuses</option>{Object.entries(statusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label></div>
        {Boolean(queueError) && <div className="review-notice review-warning" role="alert"><p>{safeError(queueError)}</p><p>Queue data may be stale. Review actions are paused until a fresh read succeeds.</p></div>}
        {!queue && queueBusy ? <StatusPanel kind="loading" title="Loading registrations">Reading authorized counter records.</StatusPanel>
          : !queue ? <StatusPanel kind="error" title="Queue unavailable">Use Refresh queue to try again.</StatusPanel>
          : queue.items.length === 0 ? <StatusPanel kind="empty" title="No registrations in this view">Try another category or status.</StatusPanel>
          : <ul className="review-list" tabIndex={0} aria-label="Registration queue records">{queue.items.map((item) => <li key={item.id}><button className={`review-row ${selected === item.id ? "is-selected" : ""}`} aria-pressed={selected === item.id} disabled={locked} onClick={() => select(item.id)}>
            <span className="review-row-heading"><strong>{item.publicReference}</strong><span className={`review-status review-status-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span></span>
            <span>{item.maskedVisitorName} · {categoryLabels[item.categoryCode]}</span><span className="muted">{item.destinationLabel} · {formatMyt(item.submittedAt)}</span>
          </button></li>)}</ul>}
        {queue && <footer className="review-pagination"><span className="muted">{queue.total} records · Page {page + 1}</span><div className="review-actions">
          <Button variant="secondary" disabled={locked || queueBusy || page === 0} onClick={() => { clearSelection(); setPage(page - 1); }}>Previous</Button>
          <Button variant="secondary" disabled={locked || queueBusy || (page + 1) * 10 >= queue.total} onClick={() => { clearSelection(); setPage(page + 1); }}>Next</Button>
        </div><small className="muted">Last read {formatMyt(queue.serverNow)} · MYT · Checks every 5 seconds</small></footer>}
      </section>
      <section className="review-detail" aria-label="Selected registration">
        {detailBusy ? <StatusPanel kind="loading" title="Loading registration">Checking the selected record.</StatusPanel>
          : detailError ? <StatusPanel kind="error" title="Registration unavailable" action={selected && <Button onClick={() => void loadDetail(selected)}>Refresh detail</Button>}>{safeError(detailError)}</StatusPanel>
          : !detail ? <StatusPanel kind="empty" title="Select a registration"><ClipboardCheck size={28} aria-hidden="true" />Choose a record from the queue to review its masked details.</StatusPanel>
          : <>
            <div className="review-section-heading"><div><h2 ref={detailHeading} tabIndex={-1}>{detail.publicReference}</h2><p>{categoryLabels[detail.categoryCode]} · {statusLabels[detail.status]}</p></div>
              <Button variant="secondary" disabled={mutation.kind === "pending"} onClick={() => { setCommandError(null); void loadDetail(detail.id); void loadQueue(); }}>Refresh detail</Button></div>
            {detail.source === "SYNTHETIC" && <p className="review-source">Synthetic demo record · Staff simulation is required for approval.</p>}
            <dl className="review-facts"><div><dt>Visitor</dt><dd>{detail.maskedVisitorName}</dd></div><div><dt>Destination</dt><dd>{detail.destinationLabel}</dd></div>
              <div><dt>Identification</dt><dd>{detail.maskedIdentification}</dd></div><div><dt>Phone</dt><dd>{detail.maskedPhone}</dd></div>
              <div><dt>Submitted</dt><dd>{formatMyt(detail.submittedAt)} MYT</dd></div><div><dt>Version</dt><dd>{detail.version}</dd></div>
              {penjaga && <><div><dt>MRN</dt><dd>{detail.maskedMrn ?? "Not available"}</dd></div><div><dt>MRN feedback</dt><dd>{detail.mrnMode === "mock" ? "Mock" : "Manual"} · {feedbackLabel(detail.mrnFeedback)}</dd></div></>}</dl>
            {penjaga && <p className="review-notice">MRN feedback is not patient verification. Compare the synthetic MRN and ward records before approving.</p>}
            {(staleDetail || conflict) && <p className="review-notice review-warning" role="alert">This record changed. Refresh the detail and complete the checks again.</p>}
            {detail.review && <div className="review-history"><h3>Review record</h3><p>Staff {detail.review.actorId} · {formatMyt(detail.review.reviewedAt)} MYT</p>
              <p>{detail.review.source === "SYNTHETIC_MANUAL" ? "Synthetic staff verification" : "Local review"}</p>{detail.review.reasonCode && <p>{reasonLabels[detail.review.reasonCode]}</p>}</div>}
            {detail.status === "SUBMITTED" && <>
              <fieldset className="review-checks" disabled={!editable || detail.source !== "SYNTHETIC"}><legend>Staff verification checklist</legend>
                <label><input type="checkbox" checked={identity} onChange={(event) => setIdentity(event.target.checked)} />I compared the synthetic identity record.</label>
                {penjaga && <><label><input type="checkbox" checked={mrn} onChange={(event) => setMrn(event.target.checked)} />I compared the synthetic MRN record.</label>
                  <label><input type="checkbox" checked={ward} onChange={(event) => setWard(event.target.checked)} />I confirmed the synthetic ward matches.</label></>}
              </fieldset>
              {detail.source !== "SYNTHETIC" && <p className="review-notice review-warning">Real hospital verification is not enabled. Synthetic evidence cannot approve this record.</p>}
              <div className="review-actions"><Button busy={mutation.kind === "pending" && mutation.action === "verify"} disabled={!approveReady} onClick={approve}>Approve registration</Button>
                <Dialog.Root open={rejectOpen} onOpenChange={(next) => { if (mutation.kind !== "pending") { setRejectOpen(next); setReasonError(false); } }}>
                  <Dialog.Trigger asChild><Button variant="secondary" disabled={!editable}>Reject registration</Button></Dialog.Trigger>
                  <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content review-reject-dialog"
                    onEscapeKeyDown={(event) => { if (mutation.kind === "pending") event.preventDefault(); }} onPointerDownOutside={(event) => { if (mutation.kind === "pending") event.preventDefault(); }}>
                    <Dialog.Title>Reject registration</Dialog.Title><Dialog.Description>Select a reason for {detail.publicReference}. Rejection does not send a message.</Dialog.Description>
                    {reasonError && <p ref={rejectionSummary} tabIndex={-1} className="review-notice review-warning" role="alert">Choose a rejection reason. <a href="#review-reason">Go to reason</a></p>}
                    <label className="review-reason" htmlFor="review-reason">Rejection reason<select id="review-reason" value={reason} disabled={locked} aria-invalid={reasonError} aria-describedby={reasonError ? "review-reason-error" : undefined} onChange={(event) => { setReason(event.target.value as Reason | ""); setReasonError(false); }}>
                      <option value="">Choose a reason</option>{Object.entries(reasonLabels).filter(([code]) => penjaga || code !== "MRN_WARD_NOT_CONFIRMED").map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
                    {reasonError && <p id="review-reason-error" className="field-error">A reason is required.</p>}
                    {commandNotice && <div ref={commandNoticeRef} tabIndex={-1} className="review-notice review-warning" role="alert">{commandNotice}</div>}{unknownActions}
                    <div className="dialog-actions"><Dialog.Close asChild><Button variant="secondary" disabled={mutation.kind === "pending"}>Cancel</Button></Dialog.Close><Button busy={mutation.kind === "pending" && mutation.action === "reject"} disabled={!editable} onClick={reject}>Confirm rejection</Button></div>
                  </Dialog.Content></Dialog.Portal>
                </Dialog.Root></div>
            </>}
          </>}
      </section>
    </div>
  </section>;
}

/** Fixed feedback labels avoid rendering provider error bodies or implying mock results verified a patient. */
function feedbackLabel(value: Detail["mrnFeedback"]): string {
  return ({ NOT_CHECKED: "Not checked", MATCH: "Match in test data", NO_MATCH: "No match in test data", TIMEOUT: "Timed out", UNAVAILABLE: "Unavailable" } as const)[value ?? "NOT_CHECKED"];
}
