import { useEffect, useRef, useState } from "react";
import type { Command } from "../../../lib/api-client";
import { ClientError, safeError } from "../../../lib/errors";
import { Button } from "../../../components/ui/primitives";
import { ToastNotice } from "../../../components/ui/toast";

type Pending = { execute: () => Promise<unknown>; success: (value: unknown) => void; label: string; unknown: boolean; successMessage?: string };

/** UNKNOWN is sticky: even a later 4xx cannot establish that the first attempt failed to commit. */
export function useLifecycleCommands(deny: () => void, onConflict?: () => void) {
  const [state, setState] = useState<"idle" | "pending" | "unknown">("idle");
  const [message, setMessage] = useState("");
  const [noticeTone, setNoticeTone] = useState<"info" | "success" | "error">("info");
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
      pending.current = null; setState("idle"); setNoticeTone("success"); setMessage(value.successMessage ?? `${value.label} confirmed.`); value.success(result);
    } catch (error) {
      if (!alive.current) return;
      const uncertain = value.unknown || !(error instanceof ClientError) || error.kind !== "api" || (error.status ?? 0) >= 500;
      const accessLost = lifecycleAccessLost(error);
      // A conflict invalidates displayed comparison fields without discarding an UNKNOWN original command.
      if (error instanceof ClientError && error.status === 409) onConflict?.();
      if (uncertain) { value.unknown = true; pending.current = value; setState("unknown"); }
      else { pending.current = null; setState("idle"); }
      setNoticeTone("error"); setMessage(uncertain ? "Result unknown. Keep this page and retry only the original command; do not create another operation." : lifecycleError(error));
      if (accessLost) deny();
    } finally { inFlight.current = false; }
  }
  function submit<T>(command: Command<T>, label: string, success: (value: T) => void, successMessage?: string) {
    if (pending.current || inFlight.current) return;
    const value: Pending = { execute: () => command.execute(), success: result => success(result as T), label, unknown: false, successMessage };
    pending.current = value; void execute(value);
  }
  // Keep recovery separate so a modal can expose it inside its focus boundary.
  const recovery = state === "unknown" ? <Button variant="secondary" onClick={() => { if (pending.current) void execute(pending.current); }}>Retry original command</Button> : null;
  return { submit, locked: state !== "idle", pending: state === "pending", recovery,
    notice: <>{(state === "pending" || message) && <ToastNotice tone={state === "pending" ? "info" : noticeTone}>{state === "pending" ? "Submitting one command…" : message}</ToastNotice>}</> };
}

/** A lost current scope clears cached operational/contact data as well as disabling future commands. */
export function lifecycleAccessLost(error: unknown): boolean {
  return error instanceof ClientError && (error.status === 401 || error.status === 404 || (error.status === 403 && error.code !== "CSRF_INVALID"));
}

/** Domain errors use fixed local copy; backend messages or rejected input never become interface text. */
export function lifecycleError(error: unknown): string {
  if (error instanceof ClientError) {
    const messages: Record<string, string> = {
      EXPORT_TOO_LARGE: "Too many matching records to export. Choose a shorter date range or narrow the filters.",
      SCAN_DEVICE_BUSY: "This counter reader has an active scan. Cancel or finish it before starting another.",
      SCAN_EXPIRED: "The scan expired. Cancel it, then start a new scan.",
      SCAN_BINDING_INVALID: "The scan does not match this actor, counter, purpose or record. Scan again.",
      SCAN_STATE_CONFLICT: "This scan is no longer usable. Refresh its status.",
      SCAN_PROFILE_UNKNOWN: "Select a supported synthetic sample.",
      CARD_CATEGORY_MISMATCH: "The card must be available and match the verified registration category.",
      CARD_DESTINATION_MISMATCH: "Choose a destination approved for this registration and compatible with the selected card.",
      DEADLINE_INVALID: "Choose a future return deadline, or explicitly select no deadline.",
      NO_PASS_ALREADY_RECORDED: "No pass has already been recorded for this registration. Refresh its details.",
      NO_PASS_CONFIRMATION_REQUIRED: "Select No pass and confirm this decision before continuing.",
      REGISTRATION_STATE_CONFLICT: "This registration changed. Refresh its details before continuing.",
      CARD_STATE_CONFLICT: "The card state does not allow this action. Refresh the inventory.",
      CARD_ALREADY_ENROLLED: "This pass code is already in inventory. Enter a different unique code.",
      ASSIGNMENT_NOT_OVERDUE: "This assignment is no longer active and overdue. Refresh the list.",
      ASSIGNMENT_ALREADY_ACTIVE: "This registration already has an active assignment. Open it in the assignment list.",
      NOT_FOUND: "This record is unavailable in your current scope. Recheck your session and counter.",
    };
    return messages[error.code ?? ""] ?? safeError(error);
  }
  return safeError(error);
}
