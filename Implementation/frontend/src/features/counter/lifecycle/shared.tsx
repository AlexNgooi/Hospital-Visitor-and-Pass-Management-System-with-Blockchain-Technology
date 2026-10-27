import { Button } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import type { History } from "./contracts";

/** Manual custody confirmation remains explicitly synthetic and never claims a live hospital or reader integration. */
export function SimulationNotice() {
  return <aside className="lc-mode"><strong>MANUAL · synthetic demonstration data</strong><span>Confirm card custody in this demonstration. Local audit only · WhatsApp NOT_ENABLED · Blockchain NOT_ENABLED · No live hospital or reader claim.</span></aside>;
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
