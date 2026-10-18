import { Button } from "../../components/ui/primitives";
import { safeError } from "../../lib/errors";
import { reasons, type Reason } from "./contracts";

/** Reason selection is mandatory and fixed-schema; patient/credential notes cannot be attached to administration changes. */
export function ReasonSelect({ value, onChange }: { value: Reason; onChange: (value: Reason) => void }) {
  return <label className="admin-field">Reason<select value={value} onChange={(event) => onChange(event.target.value as Reason)}>{reasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>;
}
/** Errors are announced and retain an explicit retry action without fabricated empty data. */
export function LoadNotice({ busy, error, reload }: { busy: boolean; error: unknown; reload: () => void }) {
  return <>{busy && <p role="status">Loading current data…</p>}{Boolean(error) && <div className="admin-notice" role="alert">{safeError(error)} <Button variant="secondary" onClick={reload}>Refresh</Button></div>}</>;
}
