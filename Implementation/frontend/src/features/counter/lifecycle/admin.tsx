import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../app/auth-context";
import { Button, StatusPanel } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, useLifecycleCommands } from "./commands";
import type { Card, CardPage, InventoryReferences, History } from "./contracts";
import { LifecycleHistory, Pager, SimulationNotice } from "./shared";
import "./lifecycle.css";

/** ADMIN inventory is a distinct slot and never inherits Counter Staff issue/return authority. */
export function AdminInventory() {
  const { state, refresh } = useAuth();
  if (state.kind !== "authenticated" || state.user.role !== "ADMIN") return <StatusPanel kind="error" title="Administrator access required" />;
  return <InventoryWorkspace key={state.user.id} recheck={refresh} />;
}

/** Administrator actions use visible card codes, reference destinations, expected versions and explicit custody checks. */
function InventoryWorkspace({ recheck }: { recheck: () => void }) {
  const [data, setData] = useState<CardPage | null>(null);
  const [references, setReferences] = useState<InventoryReferences | null>(null);
  const [cardCode, setCardCode] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Card | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<History | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true); const generation = useRef(0); const historyGeneration = useRef(0);
  const deny = useCallback(() => { setDenied(true); setData(null); setSelected(null); setHistory(null); setReferences(null); }, []);
  const commands = useLifecycleCommands(deny);
  const blocked = denied || commands.locked || busy;
  const reset = () => { historyGeneration.current++; setSelected(null); setEnrolling(false); setHistory(null); setReason(""); setRecovered(false); setChecked(false); };
  const refresh = useCallback(async () => {
    const seq = ++generation.current; setBusy(true); setError("");
    try {
      const [inventory, metadata] = await Promise.all([lifecycleApi.cards(page), lifecycleApi.references()]);
      if (!alive.current || generation.current !== seq) return;
      setData(inventory); setReferences(metadata);
      setCategoryCode(value => metadata.categories.some(item => item.code === value) ? value : metadata.categories[0]?.code ?? "");
      setDestinationId(value => metadata.destinations.some(item => item.id === value) ? value : metadata.destinations[0]?.id ?? "");
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
    <header className="lc-header"><div><p className="lc-eyebrow">ADMINISTRATION</p><h1>Card inventory</h1><p className="muted">Enroll visible pass codes and manage local inventory using synthetic demonstration data.</p></div><Button variant="secondary" busy={busy} disabled={commands.locked || denied} onClick={() => void refresh()}>Refresh inventory</Button></header>
    <SimulationNotice />{commands.notice}
    {denied && <StatusPanel kind="error" title="Current access must be rechecked" action={<Button onClick={recheck}>Recheck session</Button>}>Inventory and selections have been cleared.</StatusPanel>}
    {error && <p className="lc-error" role="alert">{error}</p>}
    <section className="lc-panel"><div className="lc-header"><h2>Card stock</h2><Button disabled={blocked} onClick={() => { reset(); setEnrolling(true); }}>Enroll a card</Button></div>
      {data && <><p className="lc-caption">Updated {formatMyt(data.serverNow)} MYT · UID is masked</p><div className="lc-table"><table><thead><tr><th>Card</th><th>Destination / method</th><th>Category</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {data.items.map(card => <tr key={card.id}><td>{card.cardCode}</td><td>{card.destinationLabel ?? "Legacy stock"} · {card.enrollmentMethod} / {card.source}</td><td>{card.categoryCode}</td><td><span className={`lc-badge lc-${card.status.toLowerCase()}`}>{card.status}</span></td><td><Button variant="secondary" disabled={blocked} onClick={() => void open(card)}>Open card</Button></td></tr>)}
      </tbody></table></div>{data.items.length === 0 && <p>No cards enrolled. Enter a unique visible pass code to create inventory.</p>}<Pager page={page} total={data.total} disabled={blocked} change={setPage} /></>}
    </section>
    {(enrolling || restore) && <section className="lc-panel"><h2>{enrolling ? "Enroll manual inventory" : `Manual recovery · ${selected!.cardCode}`}</h2>
      {enrolling ? <>
        <label className="lc-field">Visible pass code<input value={cardCode} maxLength={64} disabled={blocked} onChange={event => setCardCode(event.target.value)} aria-describedby="pass-code-help" /></label>
        <p id="pass-code-help" className="muted">Use a unique code printed on the card: letters, digits, hyphen or underscore. No UID/profile or enrollment scan is required.</p>
        <label className="lc-field">Category<select value={categoryCode} disabled={blocked} onChange={event => setCategoryCode(event.target.value)}>{references?.categories.map(category => <option key={category.id} value={category.code}>{category.label}</option>)}</select></label>
        <label className="lc-field">Compatible destination<select value={destinationId} disabled={blocked} onChange={event => setDestinationId(event.target.value)}>{references?.destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.label}</option>)}</select></label>
        <Button disabled={blocked || !/^[A-Za-z0-9_-]{1,64}$/.test(cardCode) || !categoryCode || !destinationId} onClick={() => commands.submit(lifecycleApi.enroll(cardCode, categoryCode, destinationId), "Manual inventory enrollment", () => { setCardCode(""); done(); })}>Register manual card</Button>
      </> : <>
        <p className="lc-mode">Demonstration recovery policy: confirm the same visible card is in custody and safe for inventory reuse. Its old lost assignment stays closed and has no actual return time.</p>
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={recovered} onChange={event => setRecovered(event.target.checked)} />I confirm this card was physically recovered.</label>
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={checked} onChange={event => setChecked(event.target.checked)} />I confirm the visible pass code and inventory checks before reuse.</label>
        <Button disabled={blocked || !recovered || !checked} onClick={() => commands.submit(lifecycleApi.inventoryAction(selected!.id, "restore", { expectedVersion: selected!.version, physicalFoundConfirmed: true, inventoryCheckedConfirmed: true, reasonCode: "DEMO_RECOVERED_AND_CHECKED" }), "Manual restoration", done)}>Restore card to AVAILABLE</Button>
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
