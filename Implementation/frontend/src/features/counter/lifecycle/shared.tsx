import { Button } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import type { History } from "./contracts";

/** Capability copy reflects actual local simulation and never implies a message was sent or a chain proof exists. */
export function SimulationNotice() {
  return <aside className="lc-mode"><strong>SIMULATED · demonstration only</strong><span>Local audit only · WhatsApp NOT_ENABLED · Blockchain NOT_ENABLED · Physical reader and hospital policy deferred.</span></aside>;
}
export function LifecycleHistory({ items }: { items: History | null }) {
  if (!items) return null;
  return <section className="lc-panel"><h3>Local history · latest 100 events</h3>{items.length === 0 ? <p>No recorded lifecycle events.</p> : <ol className="lc-history">
    {items.map(event => <li key={event.id}><strong>{event.eventType.replaceAll("_", " ")}</strong><span>{formatMyt(event.occurredAt)} MYT · actor {event.actorId}{event.reasonCode ? ` · ${event.reasonCode.replaceAll("_", " ")}` : ""}</span></li>)}
  </ol>}</section>;
}
export function Pager({ page, total, disabled, change }: { page: number; total: number; disabled: boolean; change: (page: number) => void }) {
  return <nav className="lc-row" aria-label="Results pages"><Button variant="secondary" disabled={disabled || page === 0} onClick={() => change(page - 1)}>Previous</Button><span>Page {page + 1} · {total} records</span><Button variant="secondary" disabled={disabled || (page + 1) * 25 >= total} onClick={() => change(page + 1)}>Next</Button></nav>;
}
