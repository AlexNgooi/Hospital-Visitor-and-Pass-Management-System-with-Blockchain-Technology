import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../app/auth-context";
import { useCounterScope } from "../../../app/counter-context";
import { Button, StatusPanel } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import { reviewPort } from "../review/client";
import type { Queue, QueueItem } from "../review/contracts";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, useLifecycleCommands } from "./commands";
import type { Assignment, AssignmentPage, History, Reveal } from "./contracts";
import { ManualIssue } from "./manual-issue";
import { LifecycleHistory, Pager, SimulationNotice } from "./shared";
import "./lifecycle.css";

/** Actor/counter changes unmount selections, contacts and command handles; writes remain authorized by the server. */
export function StaffLifecycle() {
  const { state, refresh } = useAuth(); const counter = useCounterScope();
  if (state.kind !== "authenticated" || state.user.role !== "COUNTER_STAFF" || !counter || !state.user.counterIds.includes(counter)) {
    return <StatusPanel kind="empty" title="Counter Staff access required">Select a currently authorized counter.</StatusPanel>;
  }
  return <StaffWorkspace key={`${state.user.id}:${counter}`} counterId={counter} recheck={refresh} />;
}

/** Verified issue queue and assignment history remain distinct; a Pass ID is created only by confirmed issue. */
function StaffWorkspace({ counterId, recheck }: { counterId: string; recheck: () => void }) {
  const [denied, setDenied] = useState(false);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [queuePage, setQueuePage] = useState(0);
  const [list, setList] = useState<AssignmentPage | null>(null);
  const [page, setPage] = useState(0);
  const [overdue, setOverdue] = useState(false);
  const [registrationFilter, setRegistrationFilter] = useState<QueueItem | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [contact, setContact] = useState<Reveal | null>(null);
  const [followup, setFollowup] = useState("CONTACT_ATTEMPTED");
  const alive = useRef(true); const generation = useRef(0); const historyGeneration = useRef(0);
  const deny = useCallback(() => { setDenied(true); setQueue(null); setList(null); setSelected(null); setAssignment(null); setRegistrationFilter(null); setContact(null); setHistory(null); }, []);
  const commands = useLifecycleCommands(deny);
  const blocked = denied || commands.locked || busy;

  /** Generation fencing prevents a stale selected-counter/filter read from replacing the latest view. */
  const refresh = useCallback(async () => {
    const seq = ++generation.current; setBusy(true); setError(""); setContact(null);
    try {
      const [registrations, assignments] = await Promise.all([
        reviewPort.list({ counterId, category: "ALL", status: "VERIFIED", page: queuePage, pageSize: 10 }),
        lifecycleApi.assignments(counterId, page, overdue, undefined, registrationFilter?.id),
      ]);
      if (!alive.current || seq !== generation.current) return;
      if (registrations.items.some(value => value.counterId !== counterId) || assignments.items.some(value => value.counterId !== counterId)) throw new Error("Scope mismatch");
      setQueue(registrations); setList(assignments);
    } catch (error) { if (alive.current && seq === generation.current) { setQueue(null); setList(null); setError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); } }
    finally { if (alive.current && seq === generation.current) setBusy(false); }
  }, [counterId, page, overdue, queuePage, registrationFilter, deny]);
  const cancelReads = useCallback(() => { generation.current++; historyGeneration.current++; }, []);
  useEffect(() => {
    alive.current = true; let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    return () => { active = false; alive.current = false; cancelReads(); };
  }, [refresh, cancelReads]);
  useEffect(() => {
    if (!contact) return;
    // Phone stays in component memory for at most 30 seconds and is never placed in storage, links or clipboard.
    const timer = window.setTimeout(() => setContact(null), Math.max(0, Math.min(30000, Date.parse(contact.expiresAt) - Date.now()))); return () => window.clearTimeout(timer);
  }, [contact]);
  const reset = () => { historyGeneration.current++; setSelected(null); setAssignment(null); setConfirmed(false); setHistory(null); setContact(null); };
  const done = () => { reset(); void refresh(); };
  async function showHistory(value: Assignment) {
    setContact(null); setHistory(null); const seq = ++historyGeneration.current;
    try { const events = await lifecycleApi.history(false, value.id); if (alive.current && seq === historyGeneration.current) setHistory(events); }
    catch (error) { if (alive.current && seq === historyGeneration.current) { setError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); } }
  }

  return <div className="lc-workspace">
    <header className="lc-header"><div><p className="lc-eyebrow">COUNTER {counterId}</p><h1>Pass lifecycle</h1><p className="muted">Manually issue, receive and follow up on visitor cards using synthetic demonstration data.</p></div><Button variant="secondary" disabled={commands.locked || denied} busy={busy} onClick={() => void refresh()}>Refresh lists</Button></header>
    <SimulationNotice />{commands.notice}
    {denied && <StatusPanel kind="error" title="Current access must be rechecked" action={<Button onClick={recheck}>Recheck session</Button>}>Visible records and contacts have been cleared. Keep an unknown original command until its result is confirmed.</StatusPanel>}
    {error && <p role="alert" className="lc-error">{error}</p>}
    <section className="lc-panel"><h2>Approved registrations</h2><p className="muted">Select a VERIFIED registration, choose available compatible cards and confirm handover.</p>
      {queue ? <><div className="lc-table"><table><thead><tr><th>Registration</th><th>Visitor</th><th>Category</th><th>Destination</th><th>Action</th></tr></thead><tbody>
        {queue.items.map(item => <tr key={item.id}><td>{item.publicReference}</td><td>{item.maskedVisitorName}</td><td>{item.categoryCode}</td><td>{item.destinationLabel}</td><td><div className="lc-row"><Button variant="secondary" disabled={blocked} onClick={() => { reset(); setRegistrationFilter(item); setOverdue(false); setPage(0); setSelected(item); }}>Prepare issue</Button><Button variant="secondary" disabled={blocked} onClick={() => { reset(); setOverdue(false); setPage(0); setRegistrationFilter(item); }}>View this registration's passes</Button></div></td></tr>)}
      </tbody></table></div>{queue.items.length === 0 && <p>No approved registrations on this page.</p>}
        <div className="lc-row"><Button variant="secondary" disabled={blocked || queuePage === 0} onClick={() => setQueuePage(v => v - 1)}>Previous registrations</Button><span>Page {queuePage + 1} · {queue.total} approved</span><Button variant="secondary" disabled={blocked || (queuePage + 1) * 10 >= queue.total} onClick={() => setQueuePage(v => v + 1)}>Next registrations</Button></div></> : !busy && <p>Approved queue unavailable. Refresh to retry.</p>}
    </section>
    {selected && <ManualIssue key={selected.id} registrationId={selected.id} commands={commands} disabled={blocked} onDone={done} onAccessLost={deny} />}
    <section className="lc-panel"><div className="lc-header"><h2>Assignments &amp; internal alerts</h2><label className="lc-check"><input type="checkbox" checked={overdue} disabled={blocked} onChange={event => { reset(); setPage(0); setOverdue(event.target.checked); }} />Only active overdue</label></div>
      {registrationFilter && <p>Passes for {registrationFilter.publicReference} <Button variant="secondary" disabled={blocked} onClick={() => { reset(); setPage(0); setRegistrationFilter(null); }}>Show all registrations</Button></p>}
      <p className="muted">Returns are restricted to the original issue counter in this demonstration. An overdue item is based on the server deadline even before its alert is materialized.</p>
      {list && <><p className="lc-caption">Updated {formatMyt(list.serverNow)} MYT</p><div className="lc-table"><table><thead><tr><th>Pass ID / card</th><th>Status</th><th>Issued / actual return (MYT)</th><th>Deadline / destination</th><th>Actions</th></tr></thead><tbody>
        {list.items.map(item => <tr key={item.id}><td><span className="lc-reference">{item.passReference}</span><span className="lc-caption">{item.cardCode}</span></td><td><span className={`lc-badge lc-${item.status.toLowerCase()}`}>{item.status}</span></td><td>{formatMyt(item.issuedAt)} · actor {item.issuedBy}<br />{item.returnedAt ? `${formatMyt(item.returnedAt)} · actor ${item.returnedBy}` : item.status === "LOST" ? "Lost · no actual return" : "Not returned"}</td><td>{item.dueAt ? formatMyt(item.dueAt) : "No return deadline"}<br />{item.destinationLabel ?? "Legacy destination not snapshotted"}</td><td><Button variant="secondary" disabled={blocked} onClick={() => { reset(); setAssignment(item); void showHistory(item); }}>Open assignment</Button></td></tr>)}
      </tbody></table></div>{list.items.length === 0 && <p>No assignments match this view.</p>}<Pager page={page} total={list.total} disabled={blocked} change={setPage} /></>}
    </section>
    {assignment && <section className="lc-panel"><h2>Assignment receipt</h2><p className="lc-reference">{assignment.passReference}</p><p>{assignment.cardCode} · {assignment.status} · {assignment.dueAt ? `due ${formatMyt(assignment.dueAt)} MYT` : "No return deadline"}</p><p className="lc-caption">{assignment.returnRuleKey} · default context version {assignment.returnRuleVersion} · {assignment.operationOrigin} / {assignment.dataSource} · return counter {assignment.counterId}</p>
      <p>Issued {formatMyt(assignment.issuedAt)} MYT · actor {assignment.issuedBy}<br />{assignment.returnedAt ? `Actual return ${formatMyt(assignment.returnedAt)} MYT · actor ${assignment.returnedBy}` : "No actual return recorded"}<br />Issued destination: {assignment.destinationLabel ?? "Legacy destination not snapshotted"}</p>
      {assignment.status === "LOST" && assignment.closedAt && <p>Lost closure {formatMyt(assignment.closedAt)} MYT · actor {assignment.closedBy ?? "Unknown legacy actor"}. This is separate from an actual return.</p>}
      {assignment.closedAt === null && <>
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm that this specific card has been physically received at this counter.</label>
        <Button disabled={blocked || !confirmed} onClick={() => commands.submit(lifecycleApi.returned(assignment.id, assignment.version), "Manual return", done)}>Return this pass only</Button><p className="muted">Other passes on this registration stay borrowed until individually returned.</p></>}
      {assignment.status === "LOST" && <p className="lc-error">This loan was closed as lost. Direct return is refused; ADMIN must use the demonstrated recovery policy.</p>}
      {assignment.status === "OVERDUE" && assignment.closedAt === null && <div className="lc-followup"><h3>Internal follow-up</h3><p>No external message will be sent. Contact reveal is audited for each actual display.</p>
        <Button disabled={blocked} variant="secondary" onClick={() => { setContact(null); commands.submit(lifecycleApi.reveal(assignment.id), "Contact reveal", setContact); }}>Reveal phone for 30 seconds</Button>
        {contact && <p className="lc-contact">Phone: {contact.phone} <Button variant="ghost" onClick={() => setContact(null)}>Hide now</Button></p>}
        <label className="lc-field">Follow-up outcome<select value={followup} disabled={blocked} onChange={event => setFollowup(event.target.value)}><option value="CONTACT_ATTEMPTED">Contact attempted</option><option value="CONTACTED_RETURN_REQUESTED">Contacted, return requested</option><option value="NO_ANSWER">No answer</option><option value="ESCALATED_INTERNALLY">Escalated internally</option></select></label>
        <Button disabled={blocked} onClick={() => { setContact(null); commands.submit(lifecycleApi.followup(assignment.id, followup), "Follow-up", () => { void showHistory(assignment); }); }}>Record internal follow-up</Button>
      </div>}
    </section>}
    <LifecycleHistory items={history} />
  </div>;
}
