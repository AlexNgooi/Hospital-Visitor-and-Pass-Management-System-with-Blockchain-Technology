import { useEffect, useRef, useState } from "react";
import type { Command } from "../../../lib/api-client";
import { ClientError, safeError } from "../../../lib/errors";
import { Button } from "../../../components/ui/primitives";

type Pending = { execute: () => Promise<unknown>; success: (value: unknown) => void; label: string; unknown: boolean };

/** UNKNOWN is sticky: even a later 4xx cannot establish that the first attempt failed to commit. */
export function useLifecycleCommands(deny: () => void) {
  const [state, setState] = useState<"idle" | "pending" | "unknown">("idle");
  const [message, setMessage] = useState("");
  const pending = useRef<Pending | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function execute(value: Pending) {
    if (inFlight.current) return;
    inFlight.current = true; setState("pending"); setMessage("");
    try {
      const result = await value.execute();
      if (!alive.current) return;
      pending.current = null; setState("idle"); setMessage(`${value.label} confirmed.`); value.success(result);
    } catch (error) {
      if (!alive.current) return;
      const uncertain = value.unknown || !(error instanceof ClientError) || error.kind !== "api" || (error.status ?? 0) >= 500;
      const accessLost = lifecycleAccessLost(error);
      if (uncertain) { value.unknown = true; pending.current = value; setState("unknown"); }
      else { pending.current = null; setState("idle"); }
      setMessage(uncertain ? "Result unknown. Keep this page and retry only the original command; do not create another operation." : lifecycleError(error));
      if (accessLost) deny();
    } finally { inFlight.current = false; }
  }
  function submit<T>(command: Command<T>, label: string, success: (value: T) => void) {
    if (pending.current || inFlight.current) return;
    const value: Pending = { execute: () => command.execute(), success: result => success(result as T), label, unknown: false };
    pending.current = value; void execute(value);
  }
  return { submit, locked: state !== "idle", notice: <div className="lc-command" role="status" aria-live="polite">
    {state === "pending" ? "Submitting one command…" : message}
    {state === "unknown" && <Button variant="secondary" onClick={() => { if (pending.current) void execute(pending.current); }}>Retry original command</Button>}
  </div> };
}

/** A lost current scope clears cached operational/contact data as well as disabling future commands. */
export function lifecycleAccessLost(error: unknown): boolean {
  return error instanceof ClientError && (error.status === 401 || error.status === 404 || (error.status === 403 && error.code !== "CSRF_INVALID"));
}

/** Domain errors use fixed local copy; backend messages or rejected input never become interface text. */
export function lifecycleError(error: unknown): string {
  if (error instanceof ClientError) {
    const messages: Record<string, string> = {
      SCAN_DEVICE_BUSY: "This counter reader has an active scan. Cancel or finish it before starting another.",
      SCAN_EXPIRED: "The scan expired. Cancel it, then start a new scan.",
      SCAN_BINDING_INVALID: "The scan does not match this actor, counter, purpose or record. Scan again.",
      SCAN_STATE_CONFLICT: "This scan is no longer usable. Refresh its status.",
      SCAN_PROFILE_UNKNOWN: "Select a supported synthetic sample.",
      CARD_CATEGORY_MISMATCH: "The card must be available and match the verified registration category.",
      CARD_DESTINATION_MISMATCH: "Choose a destination approved for this registration and compatible with the selected card.",
      DEADLINE_INVALID: "Choose a future return deadline, or explicitly select no deadline.",
      REGISTRATION_STATE_CONFLICT: "This registration is no longer approved for issue. Refresh the approved queue.",
      CARD_STATE_CONFLICT: "The card state does not allow this action. Refresh the inventory.",
      CARD_ALREADY_ENROLLED: "This sample is already in inventory. Select another sample.",
      ASSIGNMENT_NOT_OVERDUE: "This assignment is no longer active and overdue. Refresh the list.",
      ASSIGNMENT_ALREADY_ACTIVE: "This registration already has an active assignment. Open it in the assignment list.",
      NOT_FOUND: "This record is unavailable in your current scope. Recheck your session and counter.",
    };
    return messages[error.code ?? ""] ?? safeError(error);
  }
  return safeError(error);
}
