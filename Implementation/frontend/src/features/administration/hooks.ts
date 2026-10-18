import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { apiClient } from "../../lib/api-client";
import { ClientError, safeError } from "../../lib/errors";

/** Protected reads abort on unmount/filter change; failed polling keeps the last successful result visibly stale. */
export function useRemote<T>(path: string, schema: z.ZodType<T>, poll = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);
  const [received, setReceived] = useState(0);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let alive = true, inFlight = false;
    const controller = new AbortController();
    async function load() {
      if (inFlight) return;
      inFlight = true; setBusy(true);
      try { const value = await apiClient.get(path, schema, { authRequired: true, signal: controller.signal }); if (alive) { setData(value); setError(null); setReceived(Date.now()); } }
      catch (failure) { if (alive && !controller.signal.aborted) { setError(failure); if (failure instanceof ClientError && (failure.status === 401 || failure.status === 403)) setData(null); } }
      finally { inFlight = false; if (alive) setBusy(false); }
    }
    void load();
    const interval = poll ? window.setInterval(() => { void load(); }, poll) : undefined;
    const tick = poll ? window.setInterval(() => setNow(Date.now()), 1000) : undefined;
    return () => { alive = false; controller.abort(); window.clearInterval(interval); window.clearInterval(tick); };
  }, [path, schema, poll, revision]);
  return { data, error, busy, stale: Boolean(error) || Boolean(poll && received && now - received > 10000), reload: () => setRevision((value) => value + 1) };
}

/** Network-uncertain commands never retry automatically; a deliberate refresh lets an administrator inspect the committed version. */
export function useSave(reload: () => void) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const lock = useRef(false);
  async function run(action: () => Promise<unknown>, done?: () => void) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try { await action(); setMessage("Saved. Refreshing current data."); done?.(); reload(); }
    catch (error) { setMessage(error instanceof ClientError && error.code === "LAST_ADMIN_REQUIRED" ? "Keep at least one active administrator." : error instanceof ClientError && error.code === "LOGIN_UNAVAILABLE" ? "That login is already in use. Refresh the account list." : error instanceof ClientError && error.kind !== "api" ? `${safeError(error)} Outcome unknown. Inspect refreshed data before submitting another change.` : safeError(error)); reload(); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, message, run };
}
