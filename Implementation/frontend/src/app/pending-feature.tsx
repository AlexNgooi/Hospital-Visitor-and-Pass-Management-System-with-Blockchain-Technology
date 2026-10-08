import { StatusPanel } from "../components/ui/primitives";

/** A planned module remains visibly unavailable and cannot invent operational metrics. */
export function PendingFeature({ label }: { label: string }) {
  return (
    <div>
      <div className="page-heading">
        <span className="eyebrow">WORKSPACE</span>
        <h1>{label}</h1>
        <p>This area will be available when its module is connected.</p>
      </div>
      <StatusPanel kind="empty" title="This module is not connected">
        <p>
          No operational records have been loaded. Your session and navigation
          remain available.
        </p>
      </StatusPanel>
    </div>
  );
}
