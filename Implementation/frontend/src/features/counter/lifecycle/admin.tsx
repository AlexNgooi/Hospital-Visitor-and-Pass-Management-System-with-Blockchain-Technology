import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, X } from "lucide-react";
import { useAuth } from "../../../app/auth-context";
import { Button, StatusPanel } from "../../../components/ui/primitives";
import { ToastNotice } from "../../../components/ui/toast";
import { preserveToastInteraction } from "../../../components/ui/dialog-feedback";
import { formatMyt } from "../../../lib/time";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, useLifecycleCommands } from "./commands";
import type { Card, CardPage, InventoryReferences, History } from "./contracts";
import { LifecycleHistory, Pager, SimulationNotice } from "./shared";
import { namedPass, passPrefixes } from "./pass-naming";
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
  const [passNumber, setPassNumber] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Card | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<History | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [enrollAttempt, setEnrollAttempt] = useState(0);
  const enrollTrigger = useRef<HTMLButtonElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const restoreEnrollFocus = useRef(false);
  const cardOpener = useRef<HTMLButtonElement | null>(null);
  const inventoryHeading = useRef<HTMLHeadingElement>(null);
  const restoreCardFocus = useRef(false);
  const alive = useRef(true); const generation = useRef(0); const historyGeneration = useRef(0);
  const deny = useCallback(() => { historyGeneration.current++; setDenied(true); setEnrolling(false); setPassNumber(""); setData(null); setSelected(null); setHistory(null); setHistoryBusy(false); setHistoryError(""); setReferences(null); }, []);
  const commands = useLifecycleCommands(deny);
  const blocked = denied || commands.locked || busy;
  useEffect(() => {
    // A successful save refreshes inventory before its trigger becomes focusable again.
    if (restoreEnrollFocus.current && !blocked && !enrolling) { enrollTrigger.current?.focus(); restoreEnrollFocus.current = false; }
  }, [blocked, enrolling]);
  useEffect(() => {
    // A refreshed row may disappear; return focus to enrollment when its original icon is unavailable.
    if (restoreCardFocus.current && !blocked && !selected) {
      const target = cardOpener.current?.isConnected ? cardOpener.current : enrollTrigger.current;
      if (target && !target.disabled) target.focus();
      restoreCardFocus.current = false;
    }
  }, [blocked, selected]);
  const reset = () => { historyGeneration.current++; setSelected(null); setEnrolling(false); setHistory(null); setHistoryBusy(false); setHistoryError(""); setReason(""); setRecovered(false); setChecked(false); };
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
  /** Closing or changing the selected card fences late history responses without replaying a write. */
  async function loadHistory(card: Card) {
    const seq = ++historyGeneration.current; setHistoryBusy(true); setHistoryError("");
    try { const events = await lifecycleApi.history(true, card.id); if (alive.current && seq === historyGeneration.current) setHistory(events); }
    catch (error) { if (alive.current && seq === historyGeneration.current) { setHistory(null); setHistoryError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny(); } }
    finally { if (alive.current && seq === historyGeneration.current) setHistoryBusy(false); }
  }
  function open(card: Card, trigger: HTMLButtonElement) {
    cardOpener.current = trigger; reset(); setSelected(card); void loadHistory(card);
  }
  const restore = selected && ["LOST", "DISABLED"].includes(selected.status);
  /** Validate locally and retain the exact submitted command when its outcome is unknown. */
  function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    setEnrollAttempt(value => value + 1);
    const cardCode = namedPass(categoryCode, passNumber);
    if (!cardCode) {
      setEnrollError("Enter a pass number from 1 to 9999. The category prefix is set automatically.");
      codeInput.current?.focus(); return;
    }
    if (!references?.categories.some(item => item.code === categoryCode) || !references.destinations.some(item => item.id === destinationId)) {
      setEnrollError("Select an available category and compatible destination."); return;
    }
    setEnrollError("");
    commands.submit(lifecycleApi.enroll(cardCode, categoryCode, destinationId), "Card enrollment", () => { setPassNumber(""); done(); });
  }
  return <div className="lc-workspace">
    <header className="lc-header"><div><p className="lc-eyebrow">ADMINISTRATION</p><h1 ref={inventoryHeading} tabIndex={-1}>Card inventory</h1><p className="muted">Enroll visible pass codes and manage local inventory using synthetic demonstration data.</p></div><Button variant="secondary" busy={busy} disabled={commands.locked || denied} onClick={() => void refresh()}>Refresh inventory</Button></header>
    <SimulationNotice />{commands.notice}{!enrolling && !selected && commands.recovery}
    {denied && <StatusPanel kind="error" title="Current access must be rechecked" action={<Button onClick={recheck}>Recheck session</Button>}>Inventory and selections have been cleared.</StatusPanel>}
    {error && <ToastNotice>{error}</ToastNotice>}
    <section className="lc-panel"><div className="lc-header"><h2>Card stock</h2><Button ref={enrollTrigger} disabled={blocked || !references} onClick={() => { reset(); setPassNumber(""); setEnrollError(""); setEnrolling(true); }}>Enroll a card</Button></div>
      {data && <><p className="lc-caption">Updated {formatMyt(data.serverNow)} MYT · UID is masked</p><div className="lc-table"><table><thead><tr><th>Card</th><th>Destination / method</th><th>Category</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {data.items.map(card => <tr key={card.id}><td>{card.cardCode}</td><td>{card.destinationLabel ?? "Legacy stock"} · {card.enrollmentMethod} / {card.source}</td><td>{card.categoryCode}</td><td><span className={`lc-badge lc-${card.status.toLowerCase()}`}>{card.status}</span></td><td><Button variant="secondary" className="lc-icon-button" disabled={blocked} aria-label={`Open card ${card.cardCode}`} aria-haspopup="dialog" title="Open card" onClick={event => open(card, event.currentTarget)}><Eye size={20} aria-hidden="true" /></Button></td></tr>)}
      </tbody></table></div>{data.items.length === 0 && <p>No cards enrolled. Choose a category and an unused pass number to create inventory.</p>}<Pager page={page} total={data.total} disabled={blocked} change={setPage} /></>}
    </section>
    <Dialog.Root open={enrolling} onOpenChange={next => { if (!next && !commands.locked) { setEnrolling(false); setPassNumber(""); setEnrollError(""); } }}>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content onInteractOutside={preserveToastInteraction} className="dialog-content lc-enroll-dialog" onOpenAutoFocus={event => { event.preventDefault(); codeInput.current?.focus(); }}
          onCloseAutoFocus={event => { event.preventDefault(); restoreEnrollFocus.current = true; if (!enrollTrigger.current?.disabled) { enrollTrigger.current?.focus(); restoreEnrollFocus.current = false; } }}
          onEscapeKeyDown={event => { if (commands.locked) event.preventDefault(); }}
          onPointerDownOutside={event => { if (commands.locked) event.preventDefault(); }}>
          <div className="lc-header"><Dialog.Title>Enroll a card</Dialog.Title><Dialog.Close asChild><Button variant="ghost" disabled={commands.locked} aria-label="Close enrollment"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
          <Dialog.Description>Choose a category, enter your pass number and select its destination.</Dialog.Description>
          {enrollError && <ToastNotice revision={enrollAttempt}>{enrollError}</ToastNotice>}
          <form className="lc-enroll-form" onSubmit={enroll} noValidate aria-busy={commands.pending}>
        <label className="lc-field">Category<select value={categoryCode} disabled={blocked} onChange={event => { setCategoryCode(event.target.value); setEnrollError(""); }}>{references?.categories.map(category => <option key={category.id} value={category.code}>{category.label}</option>)}</select></label>
        <label className="lc-field">Pass number<span className="lc-pass-number"><span aria-hidden="true">{passPrefixes[categoryCode] ?? ""}</span><input ref={codeInput} value={passNumber} maxLength={4} inputMode="numeric" pattern="[0-9]{1,4}" disabled={blocked} required autoComplete="off" spellCheck={false} aria-invalid={Boolean(enrollError)} onChange={event => { setPassNumber(event.target.value); setEnrollError(""); }} aria-describedby="pass-code-help pass-code-preview" /></span></label>
        <p id="pass-code-help" className="muted">Choose any unused number from 1 to 9999. Numbers do not need to be consecutive; leading zeros are removed.</p>
        <p id="pass-code-preview" className="pass-summary">Pass ID: <strong>{namedPass(categoryCode, passNumber) ?? `${passPrefixes[categoryCode] ?? ""}…`}</strong></p>
        <label className="lc-field">Compatible destination<select value={destinationId} disabled={blocked} onChange={event => setDestinationId(event.target.value)}>{references?.destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.label}</option>)}</select></label>
        {commands.recovery}
        <div className="dialog-actions"><Dialog.Close asChild><Button variant="secondary" disabled={commands.locked}>Cancel</Button></Dialog.Close><Button type="submit" busy={commands.pending} disabled={blocked}>Register manual card</Button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <Dialog.Root open={Boolean(selected)} onOpenChange={next => { if (!next && !commands.locked) reset(); }}>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content onInteractOutside={preserveToastInteraction} className="dialog-content lc-card-dialog"
          onCloseAutoFocus={event => {
            event.preventDefault();
            restoreCardFocus.current = true;
            if (cardOpener.current?.isConnected && !cardOpener.current.disabled) { cardOpener.current.focus(); restoreCardFocus.current = false; }
            else inventoryHeading.current?.focus();
          }}
          onEscapeKeyDown={event => { if (commands.locked) event.preventDefault(); }}
          onPointerDownOutside={event => { if (commands.locked) event.preventDefault(); }}>
          <div className="lc-header"><Dialog.Title>Card details</Dialog.Title><Dialog.Close asChild><Button variant="ghost" className="lc-icon-button" disabled={commands.locked} aria-label="Close card details"><X size={20} aria-hidden="true" /></Button></Dialog.Close></div>
          <Dialog.Description>View this card's details, manage its inventory status and inspect local history.</Dialog.Description>
          {selected && <>
            <dl className="lc-card-facts"><div><dt>Visible pass code</dt><dd>{selected.cardCode}</dd></div><div><dt>Status</dt><dd><span className={`lc-badge lc-${selected.status.toLowerCase()}`}>{selected.status}</span></dd></div><div><dt>Category</dt><dd>{selected.categoryCode}</dd></div><div><dt>Destination</dt><dd>{selected.destinationLabel ?? "Legacy stock"}</dd></div><div><dt>Enrollment method</dt><dd>{selected.enrollmentMethod}</dd></div><div><dt>Data source</dt><dd>{selected.source}</dd></div></dl>
    {restore && <section className="lc-card-actions"><h3>Manual recovery</h3>
        <p className="lc-mode">Demonstration recovery policy: confirm the same visible card is in custody and safe for inventory reuse. Its old lost assignment stays closed and has no actual return time.</p>
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={recovered} onChange={event => setRecovered(event.target.checked)} />I confirm this card was physically recovered.</label>
        <label className="lc-check"><input type="checkbox" disabled={blocked} checked={checked} onChange={event => setChecked(event.target.checked)} />I confirm the visible pass code and inventory checks before reuse.</label>
        <Button disabled={blocked || !recovered || !checked} onClick={() => commands.submit(lifecycleApi.inventoryAction(selected!.id, "restore", { expectedVersion: selected!.version, physicalFoundConfirmed: true, inventoryCheckedConfirmed: true, reasonCode: "DEMO_RECOVERED_AND_CHECKED" }), "Manual restoration", done)}>Restore card to AVAILABLE</Button>
    </section>}
    {!restore && <section className="lc-card-actions"><h3>Manage card</h3><p className="muted">Marking an issued or overdue card lost closes its active assignment and opens an unresolved lost case. A disabled card must first be AVAILABLE.</p>
      <label className="lc-field">Required safe reason<select value={reason} disabled={blocked} onChange={event => setReason(event.target.value)}><option value="">Choose a reason</option><option value="REPORTED_LOST">Reported lost</option><option value="MISSING_DURING_CHECK">Missing during inventory check</option>{selected.status === "AVAILABLE" && <><option value="DAMAGED">Damaged</option><option value="REMOVED_FROM_SERVICE">Removed from service</option></>}</select></label>
      <div className="lc-row"><Button disabled={blocked || !["REPORTED_LOST", "MISSING_DURING_CHECK"].includes(reason)} onClick={() => commands.submit(lifecycleApi.inventoryAction(selected.id, "mark-lost", { expectedVersion: selected.version, reasonCode: reason }), "Lost marking", done)}>Mark LOST and close active loan</Button>
        {selected.status === "AVAILABLE" && <Button variant="secondary" disabled={blocked || !["DAMAGED", "REMOVED_FROM_SERVICE"].includes(reason)} onClick={() => commands.submit(lifecycleApi.inventoryAction(selected.id, "disable", { expectedVersion: selected.version, reasonCode: reason }), "Card disabling", done)}>Disable available card</Button>}</div>
    </section>}
    {historyBusy && <p role="status">Loading card history…</p>}
    {historyError && <ToastNotice action={<Button variant="secondary" disabled={commands.locked} onClick={() => void loadHistory(selected)}>Retry card history</Button>}>{historyError}</ToastNotice>}
    <LifecycleHistory items={history} />
    {commands.recovery}
          </>}
          <div className="dialog-actions"><Dialog.Close asChild><Button variant="secondary" disabled={commands.locked}>Close</Button></Dialog.Close></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
