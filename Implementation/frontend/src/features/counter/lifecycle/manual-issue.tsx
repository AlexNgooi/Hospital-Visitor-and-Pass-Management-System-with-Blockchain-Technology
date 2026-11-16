import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../../components/ui/primitives";
import { ToastNotice } from "../../../components/ui/toast";
import { formatMyt } from "../../../lib/time";
import { ClientError } from "../../../lib/errors";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, type useLifecycleCommands } from "./commands";
import type { Card, IssueContext, PassSelection } from "./contracts";
import { Pager } from "./shared";
import "./lifecycle.css";

type Choice = { card: Card; destinationId: string; deadline: string; noDeadline: boolean };
/** Edit explicit MYT wall time regardless of the browser timezone. */
function wallTime(instant: string, hours: number): string {
  return new Date(Date.parse(instant) + (hours + 8) * 3600000).toISOString().slice(0, 16);
}
/** Shared selection form for combined approval and existing approved registrations. */
export function ManualIssue({ registrationId, commands, disabled, onDone, onAccessLost, reviewVersion, footer }: {
  registrationId: string; commands: ReturnType<typeof useLifecycleCommands>; disabled: boolean;
  onDone: () => void; onAccessLost: () => void; reviewVersion?: number; footer?: ReactNode;
}) {
  const [context, setContext] = useState<IssueContext | null>(null);
  const [page, setPage] = useState(0), [attempt, setAttempt] = useState(0);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [noPass, setNoPass] = useState(false);
  const [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    void lifecycleApi.issueContext(registrationId, page, controller.signal).then(value => {
      if (!active) return;
      if (value.registrationId !== registrationId) throw new Error("Scope mismatch");
      setContext(value); setError(""); setLoading(false);
    }).catch(error => {
      if (active) {
        setContext(null); setError(lifecycleError(error)); setLoading(false);
        if (lifecycleAccessLost(error)) { setChoices({}); onAccessLost(); }
      }
    });
    return () => { active = false; controller.abort(); };
  }, [registrationId, page, attempt, onAccessLost]);
  const selected = Object.values(choices);
  const changed = context !== null && reviewVersion !== undefined && context.version !== reviewVersion;
  const blocked = disabled || loading || !context || changed || (!context.multipleActivePassesAllowed && context.activePassCount > 0);
  const noPassBlocked = noPass && !!context && (context.activePassCount > 0 || context.noPassRecorded);
  /** A single-category selection replaces its predecessor; multi-category selection preserves individual deadlines. */
  function choose(id: string) {
    setError("");
    // No pass is an explicit, mutually exclusive choice rather than an empty physical issue batch.
    if (id === "NO_PASS") { setChoices({}); setNoPass(true); return; }
    setNoPass(false);
    if (!id) { setChoices({}); return; }
    const card = context?.cards.items.find(value => value.id === id);
    if (!context || !card) return;
    const choice: Choice = { card, destinationId: card.destinationId ?? context.destinations[0]?.id ?? "",
      noDeadline: context.defaultReturnHours === null, deadline: wallTime(context.cards.serverNow, context.defaultReturnHours ?? 1) };
    setChoices(current => context.multipleActivePassesAllowed ? { ...current, [id]: choice } : { [id]: choice });
  }
  function update(id: string, patch: Partial<Choice>) { setChoices(current => ({ ...current, [id]: { ...current[id], ...patch } })); }
  function reload() { setChoices({}); setNoPass(false); setLoading(true); setAttempt(value => value + 1); }
  function submit() {
    if (blocked || noPassBlocked || !context || (!noPass && selected.length === 0) || commands.locked) return;
    try {
      const passes: PassSelection[] = selected.map(choice => ({ cardId: choice.card.id, expectedVersion: choice.card.version,
        destinationId: choice.destinationId, dueAt: choice.noDeadline ? null : new Date(`${choice.deadline}:00+08:00`).toISOString() }));
      if (passes.some(pass => !pass.destinationId || (pass.dueAt !== null && Date.parse(pass.dueAt) <= Date.now()))) {
        setError("Choose an eligible destination and a future deadline, or select no deadline."); return;
      }
      // Only a physical issue attests handover; no pass uses its own immutable command and audit action.
      const original = noPass
        ? reviewVersion === undefined ? lifecycleApi.noPass(registrationId, context.version) : lifecycleApi.approveWithoutPass(registrationId, reviewVersion)
        : reviewVersion === undefined ? lifecycleApi.issue(registrationId, context.version, passes) : lifecycleApi.approveAndIssue(registrationId, reviewVersion, passes);
      // Validate the receipt before the shared hook announces success; retry retains this exact original handle.
      const command = { key: original.key, execute: async (signal?: AbortSignal) => {
        const result = await original.execute(signal);
        if (result.id !== registrationId || result.status !== (noPass ? "VERIFIED" : "ISSUED") || result.version !== (reviewVersion === undefined ? context.version : reviewVersion + 1)) throw new ClientError("invalid-response");
        return result;
      } };
      commands.submit(command, noPass ? "No pass" : reviewVersion === undefined ? "Pass issuance" : "Registration approval and pass issuance", onDone,
        noPass ? reviewVersion === undefined ? "No pass recorded." : "Registration approved. No pass recorded." : undefined);
    } catch { setError("Enter a valid return date and time, or select no deadline."); }
  }
  return <section className="pass-issue-form" aria-label="Pass issuance">
    <h2>Pass issuance</h2><p className="muted">Choose an available pass or select No pass to complete this registration.</p>
    {error && <ToastNotice>{error}</ToastNotice>}
    {loading && <p role="status">Loading eligible passes…</p>}
    {!loading && !context && <Button variant="secondary" disabled={disabled} onClick={reload}>Retry inventory</Button>}
    {changed && <p role="alert">This registration changed. Refresh its details before issuing a pass.</p>}
    {context && <>
      {context.activePassCount > 0 && <p>{context.activePassCount} active pass(es). {context.multipleActivePassesAllowed ? "Additional passes are allowed for this category." : "Return the active pass before issuing another."}</p>}
      {context.noPassRecorded && <p className="pass-summary" role="status">A No pass decision was previously recorded. You can still issue a physical pass if needed.</p>}
      <label className="lc-field">{context.multipleActivePassesAllowed ? "Add available pass" : "Available pass"}
        <select value={noPass ? "NO_PASS" : context.multipleActivePassesAllowed ? "" : selected[0]?.card.id ?? ""} disabled={blocked} onChange={event => choose(event.target.value)}>
          <option value="">Choose a pass</option>
          <option value="NO_PASS" disabled={context.activePassCount > 0 || context.noPassRecorded}>No pass</option>
          {!context.multipleActivePassesAllowed && selected[0] && !context.cards.items.some(card => card.id === selected[0].card.id) && <option value={selected[0].card.id}>{selected[0].card.cardCode}</option>}
          {context.cards.items.filter(card => !context.multipleActivePassesAllowed || !choices[card.id]).map(card => <option key={card.id} value={card.id} disabled={context.multipleActivePassesAllowed && selected.length >= 50}>{card.cardCode} · {card.destinationLabel ?? "Choose destination"}</option>)}
        </select>
      </label>
      {noPass && <p className="pass-summary" role="status">No pass will be issued. This decision is saved with the registration and will not appear in Pass returns.</p>}
      {!noPass && context.cards.total === 0 && <p role="status">No compatible passes are available. Select No pass, refresh inventory or try again when a pass is returned.</p>}
      {!noPass && context.cards.total > 25 && <Pager page={page} total={context.cards.total} disabled={disabled || loading} change={value => { setLoading(true); setPage(value); }} />}
      {selected.map(choice => <fieldset className="pass-choice" key={choice.card.id} disabled={blocked}>
        <legend>{choice.card.cardCode} <span className="badge">Available</span></legend>
        <label className="lc-field">Destination<select value={choice.destinationId} onChange={event => update(choice.card.id, { destinationId: event.target.value })}>
          {context.destinations.filter(destination => choice.card.destinationId === null || destination.id === choice.card.destinationId).map(destination => <option key={destination.id} value={destination.id}>{destination.label}</option>)}
        </select></label>
        <div className="deadline-choice" role="group" aria-label={`Return deadline for ${choice.card.cardCode}`}>
          <span>Return deadline</span><div className="deadline-options">
            <Button variant="secondary" aria-pressed={choice.noDeadline} onClick={() => update(choice.card.id, { noDeadline: true })}>No deadline</Button>
            <Button variant="secondary" aria-pressed={!choice.noDeadline} onClick={() => update(choice.card.id, { noDeadline: false })}>Set date &amp; time</Button>
          </div>
        </div>
        {!choice.noDeadline && <label className="lc-field">Return deadline (MYT)<input type="datetime-local" required value={choice.deadline} onChange={event => update(choice.card.id, { deadline: event.target.value })} /></label>}
        <p className="pass-summary">{choice.card.cardCode} → {context.destinations.find(value => value.id === choice.destinationId)?.label}<br /><small>{choice.noDeadline ? "No return deadline · Return is still required" : `Return by ${choice.deadline.replace("T", " ")} MYT`}</small></p>
        {context.multipleActivePassesAllowed && <Button variant="ghost" onClick={() => setChoices(current => { const next = { ...current }; delete next[choice.card.id]; return next; })}>Remove {choice.card.cardCode}</Button>}
      </fieldset>)}
      <div className="pass-stock-meta"><small className="muted">Inventory checked {formatMyt(context.cards.serverNow)} MYT</small><Button variant="ghost" disabled={disabled || loading} onClick={reload}>Refresh inventory</Button></div>
      <p className="pass-attestation">{noPass
        ? reviewVersion === undefined ? "Select Record no pass to save this decision." : "Compare the visitor’s identity, registration and destination details, then select Approve without pass."
        : <>{reviewVersion === undefined ? "Select Issue pass" : "Compare the visitor’s identity, registration and destination details, then select Approve & issue pass"} after handing over the physical {selected.length > 1 ? "passes" : "pass"}.</>}</p>
    </>}
    <div className="review-modal-footer">{footer}<Button busy={commands.pending} disabled={blocked || noPassBlocked || (!noPass && selected.length === 0)} onClick={submit}>{noPass ? reviewVersion === undefined ? "Record no pass" : "Approve without pass" : reviewVersion === undefined ? "Issue pass" : "Approve & issue pass"}{selected.length > 1 ? ` (${selected.length})` : ""}</Button></div>
  </section>;
}
