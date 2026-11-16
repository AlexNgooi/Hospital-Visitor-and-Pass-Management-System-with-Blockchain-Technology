import { useRef, type RefObject } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import { categoryLabels } from "../review/contracts";
import type { PassRow } from "./contracts";
import { usePassScroll, type usePassFeed } from "./pass-feed";

/** Generated references are shortened visually; full values remain in the tooltip, return dialog and CSV. */
export function PassReference({ value }: { value: string }) {
  return <span className="pass-reference" title={value}>{value.length > 26 ? `${value.slice(0, 15)}…${value.slice(-6)}` : value}</span>;
}

/** Both active and completed lists use their own keyboard-accessible scroll region, without pagination buttons. */
export function PassTable({ feed, history = false, disabled = false, onReturn, scrollRef }: {
  feed: ReturnType<typeof usePassFeed>; history?: boolean; disabled?: boolean; onReturn?: (row: PassRow) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  usePassScroll(scrollRef, sentinel, feed);
  return <div ref={scrollRef} className="pass-table-scroll" role="region" aria-label={history ? "Scrollable pass history" : "Scrollable issued passes"} tabIndex={0}>
    <table className="pass-table"><thead><tr><th>Visitor name</th><th>Category</th><th>Pass ID</th><th>Destination</th>
      {history ? <><th>Issued (MYT)</th><th>Returned (MYT)</th></> : <><th>Status</th><th>Action</th></>}
    </tr></thead><tbody>
      {feed.items.map(row => <tr key={row.assignment.id}>
        <td><strong className="pass-visitor-name">{row.visitorName}</strong></td><td>{categoryLabels[row.categoryCode]}</td>
        <td><PassReference value={row.assignment.passReference} /></td><td>{row.assignment.destinationLabel ?? "Legacy destination"}</td>
        {history ? <><td>{formatMyt(row.assignment.issuedAt)}</td><td>{row.assignment.returnedAt ? formatMyt(row.assignment.returnedAt) : "—"}</td></>
          : <><td><span className={`lc-badge lc-${row.assignment.status.toLowerCase()}`}>{row.assignment.status === "OVERDUE" ? "Overdue" : "Issued"}</span></td>
            <td><Button variant="secondary" disabled={disabled || feed.busy} aria-label={`Return pass ${row.assignment.passReference}`} onClick={() => onReturn?.(row)}><ArrowLeft size={16} aria-hidden="true" />Return pass</Button></td></>}
      </tr>)}
      {feed.ready && !feed.busy && !feed.nextCursor && feed.items.length === 0 && <tr><td colSpan={6} className="pass-empty">{history ? "No completed returns match these filters." : "No outstanding passes match these filters."}</td></tr>}
    </tbody></table>
    <div ref={sentinel} className="pass-scroll-sentinel" aria-hidden="true" />
    {feed.busy && <p className="pass-read-status" role="status">Loading {history ? "history" : "passes"}…</p>}
    {feed.error && <div className="pass-read-error" role="alert"><p>{feed.error}</p><Button variant="secondary" onClick={feed.nextCursor ? feed.more : feed.refresh}>Retry loading</Button></div>}
    {!feed.busy && !feed.error && feed.nextCursor && <p className="pass-read-status">More records load as you scroll.</p>}
  </div>;
}
