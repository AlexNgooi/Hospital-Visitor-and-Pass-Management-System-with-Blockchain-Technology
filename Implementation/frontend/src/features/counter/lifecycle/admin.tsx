import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../app/auth-context";
import { Button, StatusPanel } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, useLifecycleCommands } from "./commands";
import type { Card, CardPage, Counter, History } from "./contracts";
import { ScanWorkflow } from "./scan";
import { LifecycleHistory, Pager, SimulationNotice } from "./shared";
import "./lifecycle.css";

/** ADMIN inventory is a distinct slot and never inherits Counter Staff issue/return authority. */
export function AdminInventory() {
  const { state, refresh } = useAuth();
  if (state.kind !== "authenticated" || state.user.role !== "ADMIN") return <StatusPanel kind="error" title="Administrator access required" />;
  return <InventoryWorkspace key={state.user.id} recheck={refresh} />;
}

/** Administrator actions use reason enums, expected versions and scanned recovery evidence rather than arbitrary status editing. */
function InventoryWorkspace({ recheck }: { recheck: () => void }) {
  const [data, setData] = useState<CardPage | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [counterId, setCounterId] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Card | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [evidence, setEvidence] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<History | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const alive = useRef(true); const generation = useRef(0); const historyGeneration = useRef(0);
  const deny = useCallback(() => { setDenied(true); setData(null); setSelected(null); setHistory(null); setCounters([]); setEvidence(null); }, []);
  const commands = useLifecycleCommands(deny);
  const blocked = denied || commands.locked || busy;
  const reset = () => { historyGeneration.current++; setSelected(null); setEnrolling(false); setHistory(null); setEvidence(null); setScanActive(false); setReason(""); setRecovered(false); setChecked(false); setRevision(v => v + 1); };
  const refresh = useCallback(async () => {
    const seq = ++generation.current; setBusy(true); setError("");
    try {
      const [inventory, activeCounters] = await Promise.all([lifecycleApi.cards(page), lifecycleApi.counters()]);
      if (!alive.current || generation.current !== seq) return;
      setData(inventory); setCounters(activeCounters); setCounterId(value => activeCounters.some(item => item.id === value) ? value : (activeCounters[0]?.id ?? ""));
    } catch (error) { if (alive.current && generation.current === seq) { setData(null); setError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); } }
    finally { if (alive.current && generation.current === seq) setBusy(false); }
  }, [page, deny]);
  const cancelReads = useCallback(() => { generation.current++; historyGeneration.current++; }, []);
  useEffect(() => {
    alive.current = true; let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    return () => { active = false; alive.current = false; cancelReads(); };
  }, [refresh, cancelReads]);
  const done = () => { reset(); void refresh(); };
  async function open(card: Card) {
    reset(); setSelected(card); const seq = ++historyGeneration.current;
    try { const events = await lifecycleApi.history(true, card.id); if (alive.current && seq === historyGeneration.current) setHistory(events); }
    catch (error) { if (alive.current && seq === historyGeneration.current) { setError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); } }
  }
  const restore = selected && ["LOST", "DISABLED"].includes(selected.status);
  return <div className="lc-workspace">
    <header className="lc-header"><div><p className="lc-eyebrow">ADMINISTRATION</p><h1>Card inventory</h1><p className="muted">Enroll trusted synthetic profiles and manage local exceptions.</p></div><Button variant="secondary" busy={busy} disabled={commands.locked || denied} onClick={() => void refresh()}>Refresh inventory</Button></header>
    <SimulationNotice />{commands.notice}
    {denied && <StatusPanel kind="error" title="Current access must be rechecked" action={<Button onClick={recheck}>Recheck session</Button>}>Inventory and evidence have been cleared.</StatusPanel>}
    {error && <p className="lc-error" role="alert">{error}</p>}
    <section className="lc-panel"><div className="lc-header"><h2>Synthetic stock</h2><Button disabled={blocked || scanActive} onClick={() => { reset(); setEnrolling(true); }}>Enroll a sample card</Button></div>
      {data && <><p className="lc-caption">Updated {formatMyt(data.serverNow)} MYT · UID is masked</p><div className="lc-table"><table><thead><tr><th>Card</th><th>UID suffix</th><th>Category</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {data.items.map(card => <tr key={card.id}><td>{card.cardCode}</td><td>{card.maskedUid}</td><td>{card.categoryCode}</td><td><span className={`lc-badge lc-${card.status.toLowerCase()}`}>{card.status}</span></td><td><Button variant="secondary" disabled={blocked || scanActive} onClick={() => void open(card)}>Open card</Button></td></tr>)}
      </tbody></table></div>{data.items.length === 0 && <p>No cards enrolled. Use the synthetic scan flow to create inventory.</p>}<Pager page={page} total={data.total} disabled={blocked || scanActive} change={setPage} /></>}
    </section>
    {(enrolling || restore) && <section className="lc-panel"><h2>{enrolling ? "Enroll synthetic card" : `Demonstration recovery · ${selected!.cardCode}`}</h2>
      <label className="lc-field">Reader counter<select value={counterId} disabled={blocked || scanActive} onChange={event => { setCounterId(event.target.value); setEvidence(null); }}><option value="">Choose active counter</option>{counters.map(counter => <option key={counter.id} value={counter.id}>{counter.name} ({counter.code})</option>)}</select></label>
      {counterId && <ScanWorkflow key={`${counterId}:${selected?.id ?? "enroll"}:${revision}`} admin counterId={counterId} purpose={enrolling ? "ENROLL" : "RESTORE"} targetId={enrolling ? "REGISTER" : selected!.id} category={enrolling ? undefined : selected!.categoryCode} commands={commands} disabled={blocked} onEvidence={setEvidence} onActive={setScanActive} onAccessLost={deny} />}
      {enrolling ? <Button disabled={blocked || !evidence} onClick={() => commands.submit(lifecycleApi.enroll(evidence!), "Card enrollment", done)}>Register scanned synthetic card</Button> : <>
        <p className="lc-mode">DEMO recovery policy only: scan the same recovered sample and explicitly confirm recovery and inventory checks. This does not represent a hospital-approved restore policy. The old lost loan stays closed.</p>
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={recovered} onChange={event => setRecovered(event.target.checked)} />I confirm the sample card was recovered.</label>
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={checked} onChange={event => setChecked(event.target.checked)} />I confirm the recovered sample was checked for inventory reuse under this DEMO rule.</label>
        <Button disabled={blocked || !evidence || !recovered || !checked} onClick={() => commands.submit(lifecycleApi.inventoryAction(selected!.id, "restore", { expectedVersion: selected!.version, scanResultId: evidence, physicalFoundConfirmed: true, inventoryCheckedConfirmed: true, reasonCode: "DEMO_RECOVERED_AND_CHECKED" }), "Demonstration restoration", done)}>Restore sample to AVAILABLE</Button>
      </>}
    </section>}
    {selected && !restore && <section className="lc-panel"><h2>{selected.cardCode}</h2><p>{selected.categoryCode} · {selected.status} · version {selected.version}</p><p className="muted">Marking an issued or overdue card lost closes its active assignment and opens an unresolved lost case. A disabled card must first be AVAILABLE.</p>
      <label className="lc-field">Required safe reason<select value={reason} disabled={blocked} onChange={event => setReason(event.target.value)}><option value="">Choose a reason</option><option value="REPORTED_LOST">Reported lost</option><option value="MISSING_DURING_CHECK">Missing during inventory check</option>{selected.status === "AVAILABLE" && <><option value="DAMAGED">Damaged</option><option value="REMOVED_FROM_SERVICE">Removed from service</option></>}</select></label>
      <div className="lc-row"><Button disabled={blocked || !["REPORTED_LOST", "MISSING_DURING_CHECK"].includes(reason)} onClick={() => commands.submit(lifecycleApi.inventoryAction(selected.id, "mark-lost", { expectedVersion: selected.version, reasonCode: reason }), "Lost marking", done)}>Mark LOST and close active loan</Button>
        {selected.status === "AVAILABLE" && <Button variant="secondary" disabled={blocked || !["DAMAGED", "REMOVED_FROM_SERVICE"].includes(reason)} onClick={() => commands.submit(lifecycleApi.inventoryAction(selected.id, "disable", { expectedVersion: selected.version, reasonCode: reason }), "Card disabling", done)}>Disable available card</Button>}</div>
    </section>}
    <LifecycleHistory items={history} />
  </div>;
}
