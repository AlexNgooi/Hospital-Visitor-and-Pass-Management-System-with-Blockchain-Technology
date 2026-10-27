import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, type useLifecycleCommands } from "./commands";
import type { Card, IssueContext, PassSelection } from "./contracts";
import { Pager } from "./shared";

type Choice = { card: Card; destinationId: string; deadline: string; noDeadline: boolean };

/** UTC instants are edited as explicit MYT wall times, independent of the browser's local timezone. */
function wallTime(instant: string, hours: number): string {
  return new Date(Date.parse(instant) + (hours + 8) * 3600000).toISOString().slice(0, 16);
}

/** The server rechecks every version and submits the bounded selection atomically; no scan capability is created. */
export function ManualIssue({ registrationId, commands, disabled, onDone, onAccessLost }: {
  registrationId: string; commands: ReturnType<typeof useLifecycleCommands>; disabled: boolean; onDone: () => void; onAccessLost: () => void;
}) {
  const [context, setContext] = useState<IssueContext | null>(null);
  const [page, setPage] = useState(0);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    void lifecycleApi.issueContext(registrationId, page, controller.signal).then(value => {
      if (active) { setContext(value); setError(""); setLoading(false); }
    }).catch(error => {
      if (active) { setContext(null); setError(lifecycleError(error)); setLoading(false); if (lifecycleAccessLost(error)) { setChoices({}); onAccessLost(); } }
    });
    return () => { active = false; controller.abort(); };
  }, [registrationId, page, onAccessLost]);
  const selected = Object.values(choices);
  const blocked = disabled || loading || !context || (!context.multipleActivePassesAllowed && context.activePassCount > 0);

  /** Any changed selection invalidates custody confirmation; stale versions remain visible until explicitly reloaded. */
  function toggle(card: Card) {
    if (!context) return;
    setConfirmed(false);
    setChoices(current => {
      if (current[card.id]) { const next = { ...current }; delete next[card.id]; return next; }
      if (Object.keys(current).length >= 50 || (!context.multipleActivePassesAllowed && Object.keys(current).length > 0)) return current;
      return { ...current, [card.id]: { card, destinationId: card.destinationId ?? context.destinations[0]?.id ?? "",
        noDeadline: context.defaultReturnHours === null, deadline: wallTime(context.cards.serverNow, context.defaultReturnHours ?? 1) } };
    });
  }
  function update(id: string, patch: Partial<Choice>) {
    setConfirmed(false); setChoices(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  }
  function submit() {
    if (!context) return;
    try {
      const passes: PassSelection[] = selected.map(choice => ({ cardId: choice.card.id, expectedVersion: choice.card.version, destinationId: choice.destinationId,
        dueAt: choice.noDeadline ? null : new Date(`${choice.deadline}:00+08:00`).toISOString() }));
      if (passes.some(pass => !pass.destinationId || (pass.dueAt !== null && Date.parse(pass.dueAt) <= Date.now()))) {
        setError("Choose an eligible destination and a future deadline, or explicitly select no deadline."); return;
      }
      commands.submit(lifecycleApi.issue(registrationId, context.version, passes), "Manual issue batch", onDone);
    } catch { setError("Enter a valid return date and time, or select no deadline."); }
  }
  return <section className="lc-panel"><h2>Choose available cards</h2>
    {error && <p role="alert" className="lc-error">{error}</p>}
    {loading && <p role="status">Loading eligible inventory…</p>}
    {context && <>
      <p>{context.multipleActivePassesAllowed ? "Multiple cards and destinations are allowed." : "One active pass per registration."} Currently active: {context.activePassCount}.</p>
      <p className="muted">Select each card and its destination. The category default is {context.defaultReturnHours === null ? "no deadline" : `${context.defaultReturnHours} hours`}; you may change it per pass. All selected cards issue together, or none do.</p>
      <div className="lc-table"><table><thead><tr><th>Select</th><th>Card</th><th>Inventory destination</th></tr></thead><tbody>
        {context.cards.items.map(card => <tr key={card.id}><td><input type="checkbox" aria-label={`Select ${card.cardCode}`} checked={!!choices[card.id]} disabled={blocked || (!choices[card.id] && (selected.length >= 50 || (!context.multipleActivePassesAllowed && selected.length > 0)))} onChange={() => toggle(card)} /></td><td>{card.cardCode}</td><td>{card.destinationLabel ?? "Legacy stock · choose eligible destination"}</td></tr>)}
      </tbody></table></div>
      {context.cards.items.length === 0 && <p>No compatible available cards on this page.</p>}
      <Pager page={page} total={context.cards.total} disabled={disabled || loading} change={value => { setLoading(true); setPage(value); }} />
      {selected.map(choice => <fieldset className="lc-panel" key={choice.card.id} disabled={blocked}><legend>{choice.card.cardCode}</legend>
        <label className="lc-field">Issued destination<select value={choice.destinationId} onChange={event => update(choice.card.id, { destinationId: event.target.value })}>
          {context.destinations.filter(destination => choice.card.destinationId === null || destination.id === choice.card.destinationId).map(destination => <option key={destination.id} value={destination.id}>{destination.label}</option>)}
        </select></label>
        <label className="lc-check"><input type="checkbox" checked={choice.noDeadline} onChange={event => update(choice.card.id, { noDeadline: event.target.checked })} />No return deadline · this card still requires an actual return</label>
        {!choice.noDeadline && <label className="lc-field">Return deadline (MYT, UTC+08:00)<input type="datetime-local" value={choice.deadline} onChange={event => update(choice.card.id, { deadline: event.target.value })} /></label>}
        <Button variant="secondary" onClick={() => toggle(choice.card)}>Remove card</Button>
      </fieldset>)}
      <p className="lc-caption">Inventory checked {formatMyt(context.cards.serverNow)} MYT. Selection limit: 50 per command.</p>
      <label className="lc-check"><input type="checkbox" disabled={blocked || selected.length === 0} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm that all {selected.length} selected cards have been handed over.</label>
      <Button disabled={blocked || !confirmed || selected.length === 0} onClick={submit}>Confirm manual issue ({selected.length})</Button>
    </>}
  </section>;
}
