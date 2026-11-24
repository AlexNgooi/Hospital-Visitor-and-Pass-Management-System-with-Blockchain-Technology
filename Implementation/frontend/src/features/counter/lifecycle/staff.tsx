import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { History as HistoryIcon, RefreshCw, X } from "lucide-react";
import { useAuth } from "../../../app/auth-context";
import { Button, StatusPanel } from "../../../components/ui/primitives";
import { preserveToastInteraction } from "../../../components/ui/dialog-feedback";
import { ClientError } from "../../../lib/errors";
import { formatMyt } from "../../../lib/time";
import type { SessionUser } from "../../../lib/contracts";
import { categoryLabels, type ReviewFields } from "../review/contracts";
import { reviewPort } from "../review/client";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, useLifecycleCommands } from "./commands";
import type { Assignment, PassFilters, PassRow } from "./contracts";
import { usePassFeed, usePassSearch } from "./pass-feed";
import { PassTable } from "./pass-table";
import { PassHistoryDialog } from "./pass-history";
import "./lifecycle.css";
import "./passes.css";

type ReturnDetail = { assignment: Assignment; fields: ReviewFields };
/** Only the active staff account can open the shared pass workspace. */
export function StaffLifecycle() {
  const { state, refresh } = useAuth();
  if (state.kind !== "authenticated" || state.user.role !== "COUNTER_STAFF" || !state.user.staffAccessEnabled) {
    return <StatusPanel kind="empty" title="Counter Staff access required">Sign in with an active counter staff account and complete password setup.</StatusPanel>;
  }
  return <StaffPassWorkspace key={state.user.id} authority={state.user} recheck={refresh} />;
}

/** Active loans, return confirmation and completed history remain separate, memory-only views. */
function StaffPassWorkspace({ authority, recheck }: { authority: SessionUser; recheck: () => void }) {
  const [denied, setDenied] = useState(false), [historyOpen, setHistoryOpen] = useState(false);
  const [category, setCategory] = useState<PassFilters["category"]>("ALL"), [status, setStatus] = useState<PassFilters["status"]>("ALL");
  const search = usePassSearch();
  const [selected, setSelected] = useState<PassRow | null>(null), [details, setDetails] = useState<ReturnDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false), [detailError, setDetailError] = useState("");
  const generation = useRef(0), alive = useRef(true), detailRequest = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null), historyButton = useRef<HTMLButtonElement>(null), rowFocus = useRef<HTMLElement | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const clearDetails = useCallback(() => { generation.current++; detailRequest.current?.abort(); setDetails(null); setDetailBusy(false); }, []);
  const deny = useCallback(() => { clearDetails(); setSelected(null); setHistoryOpen(false); setDenied(true); }, [clearDetails]);
  const conflict = useCallback(() => { clearDetails(); setDetailError("This pass changed. Refresh its details before continuing."); }, [clearDetails]);
  const commands = useLifecycleCommands(deny, conflict);
  const filters = useMemo<PassFilters>(() => ({ history: false, category, status, search: search.search }), [category, status, search.search]);
  const feed = usePassFeed(filters, deny, !denied);
  const cancelReads = useCallback(() => { generation.current++; detailRequest.current?.abort(); }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancelReads(); }; }, [cancelReads]);
  useEffect(() => {
    // Refreshed authority clears comparison fields and prevents late reads from restoring them.
    let current = true; queueMicrotask(() => { if (current) clearDetails(); });
    return () => { current = false; };
  }, [authority, clearDetails]);

  async function loadDetails(row: PassRow) {
    clearDetails(); const sequence = generation.current;
    const controller = new AbortController(); detailRequest.current = controller; setDetailBusy(true); setDetailError("");
    try {
      const pass = await lifecycleApi.assignment(row.assignment.id, controller.signal);
      if (!alive.current || sequence !== generation.current) return;
      if (pass.id !== row.assignment.id || pass.registrationId !== row.assignment.registrationId) throw new ClientError("invalid-response");
      const registration = await reviewPort.detail(pass.registrationId, controller.signal);
      if (registration.id !== pass.registrationId) throw new ClientError("invalid-response");
      const fields = await reviewPort.reviewFields!(registration.id, registration.version, controller.signal);
      if (!alive.current || sequence !== generation.current) return;
      if (fields.id !== registration.id || fields.version !== registration.version) throw new ClientError("invalid-response");
      setDetails({ assignment: pass, fields });
      if (pass.closedAt !== null) setDetailError("This pass is already closed. Refresh the issued list before another return.");
    } catch (error) {
      if (!alive.current || sequence !== generation.current || controller.signal.aborted) return;
      setDetailError(lifecycleError(error)); if (lifecycleAccessLost(error)) deny();
    } finally { if (alive.current && sequence === generation.current) setDetailBusy(false); }
  }
  function openReturn(row: PassRow) {
    if (commands.locked) return;
    rowFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(row); void loadDetails(row);
  }
  function closeReturn() { clearDetails(); setSelected(null); setDetailError(""); }
  function confirmReturn() {
    if (!details || commands.locked || detailBusy || detailError || details.assignment.closedAt !== null) return;
    const pass = details.assignment;
    const original = lifecycleApi.returned(pass.id, pass.version);
    // Validate before announcing success; all uncertain retries retain this exact command's key/body/version.
    const command = { key: original.key, execute: async (signal?: AbortSignal) => {
      const result = await original.execute(signal);
      if (result.id !== pass.id || result.reference !== pass.passReference || result.status !== "RETURNED" || result.version !== pass.version + 1) throw new ClientError("invalid-response");
      return result;
    } };
    commands.submit(command, "Pass return", () => { feed.remove(pass.id); closeReturn(); feed.refresh(); }, "Pass returned successfully.");
  }
  const basic = details?.fields.fields.filter(field => ["fullName", "identificationType", "identificationNumber", "phone"].includes(field.name)) ?? [];
  if (denied) return <StatusPanel kind="error" title="Current access must be rechecked" action={<><Button onClick={recheck}>Recheck session</Button>{commands.recovery}</>}>Cached visitor data has been cleared.{commands.notice}</StatusPanel>;
  return <div className="staff-pass-page">
    <header className="pass-page-heading"><div><h1 ref={heading} tabIndex={-1}>Pass returns</h1><p className="muted">Receive issued passes and confirm their return.</p></div><Button ref={historyButton} variant="secondary" disabled={commands.locked} onClick={() => setHistoryOpen(true)}><HistoryIcon size={18} aria-hidden="true" />View pass history</Button></header>
    {commands.notice}
    <section className="staff-pass-panel" aria-label="Issued passes"><div className="pass-panel-heading"><h2>Issued passes</h2><span className="pass-count">{feed.ready ? `${feed.items.length} ${feed.nextCursor ? "loaded" : "outstanding"}` : "Checking passes"}</span><Button variant="ghost" busy={feed.busy} disabled={commands.locked} onClick={feed.refresh}><RefreshCw size={18} aria-hidden="true" />Refresh</Button></div>
      <div className="pass-filters"><label className="pass-search">Search<input type="search" placeholder="Visitor or pass ID" maxLength={100} value={search.input} disabled={commands.locked} onChange={event => search.setInput(event.target.value)} /></label>
        <label>Category<select value={category} disabled={commands.locked} onChange={event => setCategory(event.target.value as PassFilters["category"])}><option value="ALL">All categories</option>{Object.entries(categoryLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label>Status<select value={status} disabled={commands.locked} onChange={event => setStatus(event.target.value as PassFilters["status"])}><option value="ALL">All statuses</option><option value="ISSUED">Issued</option><option value="OVERDUE">Overdue</option></select></label>
      </div>
      <PassTable feed={feed} scrollRef={scroll} disabled={commands.locked} onReturn={openReturn} />
      <footer className="pass-list-footer"><span>{feed.ready ? `${feed.items.length} ${feed.nextCursor ? "loaded" : "outstanding"} passes` : "Checking issued passes"}</span><small className="muted">{feed.serverNow ? `Updated ${formatMyt(feed.serverNow)} MYT` : ""}</small></footer>
    </section>
    {historyOpen && <PassHistoryDialog deny={deny} close={() => setHistoryOpen(false)} restoreFocus={() => historyButton.current?.focus()} />}
    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open && !commands.locked) closeReturn(); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="dialog-content pass-return-dialog" onInteractOutside={preserveToastInteraction}
        onEscapeKeyDown={event => { if (commands.locked) event.preventDefault(); }} onPointerDownOutside={event => { if (commands.locked) event.preventDefault(); }}
        onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => { if (rowFocus.current?.isConnected) rowFocus.current.focus(); else heading.current?.focus(); }); }}>
        <div className="pass-dialog-header"><div><Dialog.Title>Confirm pass return</Dialog.Title><Dialog.Description>Check the visitor and pass before confirming receipt.</Dialog.Description></div><Button variant="ghost" disabled={commands.locked} aria-label="Close pass return" onClick={closeReturn}><X size={20} aria-hidden="true" /></Button></div>
        {commands.recovery && <div className="pass-read-error" role="alert">The result is unconfirmed. Keep this dialog open and retry only the original command.{commands.recovery}</div>}
        {detailBusy && <p role="status">Loading visitor details…</p>}
        {detailError && <p className="pass-read-error" role="alert">{detailError}</p>}
        {selected && !commands.pending && (detailError || commands.recovery) && <Button variant="ghost" onClick={() => void loadDetails(selected)}>Refresh details / check current status</Button>}
        {details && <><div className="pass-return-summary"><span>Returning pass</span><strong>{details.assignment.passReference}</strong><span>{details.assignment.destinationLabel ?? "Legacy destination"}</span></div>
          <h3>Visitor details</h3><dl className="pass-return-facts">{basic.map(field => <div key={field.name}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}<div><dt>Category</dt><dd>{categoryLabels[selected!.categoryCode]}</dd></div><div><dt>Destination</dt><dd>{details.assignment.destinationLabel ?? "Legacy destination"}</dd></div><div><dt>Issued at</dt><dd>{formatMyt(details.assignment.issuedAt)} MYT</dd></div><div><dt>Status</dt><dd>{details.assignment.status === "OVERDUE" ? "Overdue" : details.assignment.status === "RETURNED" ? "Returned" : details.assignment.status === "LOST" ? "Lost" : "Issued"}</dd></div></dl>
          <p className="pass-receipt-note">Confirm only after receiving this physical pass. Only this pass will be returned.</p>
        </>}
        <div className="dialog-actions"><Button variant="secondary" disabled={commands.locked} onClick={closeReturn}>Cancel</Button><Button busy={commands.pending} disabled={!details || detailBusy || !!detailError || commands.locked || details.assignment.closedAt !== null} onClick={confirmReturn}>Confirm return</Button></div>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </div>;
}
