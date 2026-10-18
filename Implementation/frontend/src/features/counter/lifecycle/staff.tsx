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
import { ScanWorkflow } from "./scan";
import { LifecycleHistory, Pager, SimulationNotice } from "./shared";
import "./lifecycle.css";

/** Actor/counter changes unmount all scan capabilities, contacts and unresolved command handles. */
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [evidence, setEvidence] = useState<string | null>(null);
  const [scanActive, setScanActive] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [contact, setContact] = useState<Reveal | null>(null);
  const [followup, setFollowup] = useState("CONTACT_ATTEMPTED");
  const [scanRevision, setScanRevision] = useState(0);
  const alive = useRef(true); const generation = useRef(0); const historyGeneration = useRef(0);
  const deny = useCallback(() => { setDenied(true); setQueue(null); setList(null); setSelected(null); setAssignment(null); setContact(null); setHistory(null); setEvidence(null); }, []);
  const commands = useLifecycleCommands(deny);
  const blocked = denied || commands.locked || busy;

  /** Generation fencing prevents a stale selected-counter/filter read from replacing the latest view. */
  const refresh = useCallback(async () => {
    const seq = ++generation.current; setBusy(true); setError(""); setContact(null);
    try {
      const [registrations, assignments] = await Promise.all([
        reviewPort.list({ counterId, category: "ALL", status: "VERIFIED", page: queuePage, pageSize: 10 }),
        lifecycleApi.assignments(counterId, page, overdue),
      ]);
      if (!alive.current || seq !== generation.current) return;
      if (registrations.items.some(value => value.counterId !== counterId) || assignments.items.some(value => value.counterId !== counterId)) throw new Error("Scope mismatch");
      setQueue(registrations); setList(assignments);
    } catch (error) { if (alive.current && seq === generation.current) { setQueue(null); setList(null); setError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); } }
    finally { if (alive.current && seq === generation.current) setBusy(false); }
  }, [counterId, page, overdue, queuePage, deny]);
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
  const reset = () => { historyGeneration.current++; setSelected(null); setAssignment(null); setEvidence(null); setConfirmed(false); setHistory(null); setContact(null); setScanActive(false); setScanRevision(value => value + 1); };
  const done = () => { reset(); void refresh(); };
  async function showHistory(value: Assignment) {
    setContact(null); setHistory(null); const seq = ++historyGeneration.current;
    try { const events = await lifecycleApi.history(false, value.id); if (alive.current && seq === historyGeneration.current) setHistory(events); }
    catch (error) { if (alive.current && seq === historyGeneration.current) { setError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); } }
  }

  return <div className="lc-workspace">
    <header className="lc-header"><div><p className="lc-eyebrow">COUNTER {counterId}</p><h1>Pass lifecycle</h1><p className="muted">Issue, receive and follow up on synthetic visitor cards.</p></div><Button variant="secondary" disabled={commands.locked || denied} busy={busy} onClick={() => void refresh()}>Refresh lists</Button></header>
    <SimulationNotice />{commands.notice}
    {denied && <StatusPanel kind="error" title="Current access must be rechecked" action={<Button onClick={recheck}>Recheck session</Button>}>Visible records and contacts have been cleared. Keep an unknown original command until its result is confirmed.</StatusPanel>}
    {error && <p role="alert" className="lc-error">{error}</p>}
    <section className="lc-panel"><h2>Approved registrations</h2><p className="muted">Select a VERIFIED registration, scan an available matching card, then explicitly confirm simulated handover.</p>
      {queue ? <><div className="lc-table"><table><thead><tr><th>Registration</th><th>Visitor</th><th>Category</th><th>Destination</th><th>Action</th></tr></thead><tbody>
        {queue.items.map(item => <tr key={item.id}><td>{item.publicReference}</td><td>{item.maskedVisitorName}</td><td>{item.categoryCode}</td><td>{item.destinationLabel}</td><td><Button variant="secondary" disabled={blocked || scanActive} onClick={() => { reset(); setSelected(item); }}>Prepare issue</Button></td></tr>)}
      </tbody></table></div>{queue.items.length === 0 && <p>No approved registrations on this page.</p>}
        <div className="lc-row"><Button variant="secondary" disabled={blocked || scanActive || queuePage === 0} onClick={() => setQueuePage(v => v - 1)}>Previous registrations</Button><span>Page {queuePage + 1} · {queue.total} approved</span><Button variant="secondary" disabled={blocked || scanActive || (queuePage + 1) * 10 >= queue.total} onClick={() => setQueuePage(v => v + 1)}>Next registrations</Button></div></> : !busy && <p>Approved queue unavailable. Refresh to retry.</p>}
    </section>
    {selected && <section className="lc-panel"><h2>Issue · {selected.publicReference}</h2><p>{selected.categoryCode} · {selected.maskedVisitorName}</p>
      <ScanWorkflow key={`issue:${selected.id}:${scanRevision}`} admin={false} counterId={counterId} purpose="ISSUE" targetId={selected.id} category={selected.categoryCode} commands={commands} disabled={blocked} onEvidence={setEvidence} onActive={setScanActive} onAccessLost={deny} />
      <label className="lc-check"><input type="checkbox" checked={confirmed} disabled={blocked} onChange={event => setConfirmed(event.target.checked)} />I confirm that the synthetic card has been handed over in this demonstration.</label>
      <p className="muted">The server uses the current category return-hours setting (default 24 hours, DEMO policy). The receipt records the rule version and exact deadline.</p>
      <Button disabled={blocked || !confirmed || !evidence} onClick={() => commands.submit(lifecycleApi.issue(selected.id, selected.version, evidence!), "Issue", result => {
        done(); void lifecycleApi.assignment(result.id).then(value => { if (alive.current) setAssignment(value); }).catch(error => { if (alive.current) setError(lifecycleError(error)); });
      })}>Confirm simulated issue</Button>
    </section>}
    <section className="lc-panel"><div className="lc-header"><h2>Assignments &amp; internal alerts</h2><label className="lc-check"><input type="checkbox" checked={overdue} disabled={blocked || scanActive} onChange={event => { reset(); setPage(0); setOverdue(event.target.checked); }} />Only active overdue</label></div>
      <p className="muted">Returns are restricted to the original issue counter in this demonstration. An overdue item is based on the server deadline even before its alert is materialized.</p>
      {list && <><p className="lc-caption">Updated {formatMyt(list.serverNow)} MYT</p><div className="lc-table"><table><thead><tr><th>Pass ID / card</th><th>Status</th><th>Due (MYT)</th><th>Actions</th></tr></thead><tbody>
        {list.items.map(item => <tr key={item.id}><td><span className="lc-reference">{item.passReference}</span><span className="lc-caption">{item.cardCode}</span></td><td><span className={`lc-badge lc-${item.status.toLowerCase()}`}>{item.status}</span></td><td>{formatMyt(item.dueAt)}</td><td><Button variant="secondary" disabled={blocked || scanActive} onClick={() => { reset(); setAssignment(item); void showHistory(item); }}>Open assignment</Button></td></tr>)}
      </tbody></table></div>{list.items.length === 0 && <p>No assignments match this view.</p>}<Pager page={page} total={list.total} disabled={blocked || scanActive} change={setPage} /></>}
    </section>
    {assignment && <section className="lc-panel"><h2>Assignment receipt</h2><p className="lc-reference">{assignment.passReference}</p><p>{assignment.cardCode} · {assignment.status} · due {formatMyt(assignment.dueAt)} MYT</p><p className="lc-caption">{assignment.returnRuleKey} · rule version {assignment.returnRuleVersion} · SIMULATED · return counter {assignment.counterId}</p>
      {assignment.closedAt === null && <><ScanWorkflow key={`return:${assignment.id}:${scanRevision}`} admin={false} counterId={counterId} purpose="RETURN" targetId={assignment.id} commands={commands} disabled={blocked} onEvidence={setEvidence} onActive={setScanActive} onAccessLost={deny} />
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm that this synthetic card has been received back at this counter.</label>
        <Button disabled={blocked || !confirmed || !evidence} onClick={() => commands.submit(lifecycleApi.returned(assignment.id, assignment.version, evidence!), "Return", done)}>Confirm simulated return</Button></>}
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
