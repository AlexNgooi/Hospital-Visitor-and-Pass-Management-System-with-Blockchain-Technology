import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/primitives";
import { formatMyt } from "../../../lib/time";
import { lifecycleApi } from "./client";
import { lifecycleAccessLost, lifecycleError, useLifecycleCommands } from "./commands";
import type { Job, Sample } from "./contracts";

/** One counter reader remains bound to one immutable target until cancelled, expired or consumed by the business command. */
export function ScanWorkflow({ admin, counterId, purpose, targetId, category, commands, disabled, onEvidence, onActive, onAccessLost }: {
  admin: boolean; counterId: string; purpose: "ENROLL" | "ISSUE" | "RETURN" | "RESTORE"; targetId: string; category?: string;
  commands: ReturnType<typeof useLifecycleCommands>; disabled: boolean; onEvidence: (id: string | null) => void; onActive: (active: boolean) => void; onAccessLost: () => void;
}) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sample, setSample] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [readBusy, setReadBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [sampleError, setSampleError] = useState("");
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    lifecycleApi.samples(admin, controller.signal).then(setSamples).catch(error => {
      if (!controller.signal.aborted) { setSampleError(lifecycleError(error)); if (lifecycleAccessLost(error)) onAccessLost(); }
    });
    return () => controller.abort();
  }, [admin, reload, onAccessLost]);
  useEffect(() => {
    if (!job) return;
    const deadline = performance.now() + Math.max(0, Date.parse(job.expiresAt) - Date.parse(job.serverNow));
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer);
  }, [job]);
  useEffect(() => { if (remaining === 0) onEvidence(null); }, [remaining, onEvidence]);

  /** A confirmed start is recoverable through its saved ID even if the following GET fails. */
  async function refresh(id: string) {
    setReadBusy(true); setError("");
    try {
      const current = await lifecycleApi.job(admin, id);
      if (!alive.current) return;
      if (current.counterId !== counterId || current.targetId !== targetId || current.purpose !== purpose) throw new Error("Invalid scan binding");
      setJob(current);
      onEvidence(current.status === "SUCCEEDED" && Date.parse(current.expiresAt) > Date.parse(current.serverNow) ? current.scanResultId : null);
      onActive(current.status === "CLAIMED" || current.status === "SUCCEEDED");
    } catch (error) { if (alive.current) { setError(lifecycleError(error)); onEvidence(null); if (lifecycleAccessLost(error)) onAccessLost(); } }
    finally { if (alive.current) setReadBusy(false); }
  }
  const blocked = disabled || commands.locked || readBusy;
  return <section className="lc-scan" aria-label="Synthetic reader">
    <h3>SIMULATED reader · {purpose.toLowerCase()}</h3>
    <p className="muted">Counter {counterId}. Select a server-defined sample; UID, profile and category come from the adapter. Scan validity: 120 seconds.</p>
    {sampleError && <p role="alert">{sampleError} <Button variant="secondary" onClick={() => { setSampleError(""); setReload(v => v + 1); }}>Reload samples</Button></p>}
    <div className="lc-row">
      <label className="lc-field">Synthetic sample<select value={sample} disabled={blocked || Boolean(job?.status === "SUCCEEDED")} onChange={event => setSample(event.target.value)}>
        <option value="">Choose a sample</option>{samples.filter(value => !category || value.categoryCode === category).map(value => <option key={value.sampleCode} value={value.sampleCode}>{value.label}</option>)}
      </select></label>
      {!jobId && <Button disabled={blocked || !sample || !counterId} onClick={() => commands.submit(lifecycleApi.start(admin, counterId, purpose, targetId), "Scan start", result => {
        setJobId(result.id); onActive(true); void refresh(result.id);
      })}>Start bound scan</Button>}
      {jobId && <Button variant="secondary" disabled={blocked} onClick={() => void refresh(jobId)}>Refresh scan status</Button>}
      {job?.status === "CLAIMED" && <Button disabled={blocked || remaining <= 0 || !sample || !job.nonce || !job.leaseToken} onClick={() => commands.submit(lifecycleApi.simulate(admin, job, sample), "Synthetic scan", () => void refresh(job.id))}>Read synthetic sample</Button>}
      {jobId && (!job || ["CLAIMED", "SUCCEEDED", "EXPIRED"].includes(job.status)) && <Button variant="secondary" disabled={blocked} onClick={() => commands.submit(lifecycleApi.cancel(admin, jobId), "Scan cancellation", () => {
        setJobId(null); setJob(null); onEvidence(null); onActive(false);
      })}>Cancel / clear scan</Button>}
      {job && ["CONSUMED", "CANCELLED", "EXPIRED"].includes(job.status) && <Button disabled={blocked} variant="secondary" onClick={() => { setJob(null); setJobId(null); onEvidence(null); onActive(false); }}>Prepare another scan</Button>}
    </div>
    {job && <p role="status">{job.status} · {remaining > 0 ? `${remaining}s remaining` : "expired or finished"} · expires {formatMyt(job.expiresAt)} MYT{job.sampleCode ? ` · ${job.sampleCode}` : ""}</p>}
    {error && <p className="lc-error" role="alert">{error}</p>}
    <p className="lc-caption">After leaving this page, an unfinished scan may keep this reader busy until its two-minute expiry. No physical reader or external service is used.</p>
  </section>;
}
